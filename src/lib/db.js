import { supabase } from './supabase';
import { products as localProducts } from '../data/products';
import { getEffectiveRole } from './authz';

function isMissingColumnError(error) {
  const message = error?.message || '';
  return (
    error?.code === 'PGRST204' ||
    /column .* does not exist/i.test(message) ||
    /Could not find the '.+' column/i.test(message)
  );
}

function isMissingRelationError(error) {
  const message = error?.message || '';
  return (
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    /Could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}

async function logAdminActivity({ adminId, actionType, entityType, entityId = null, details = {} }) {
  if (!adminId) return;

  const { error } = await supabase.from('admin_activity_logs').insert([
    {
      admin_id: adminId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      details,
    },
  ]);

  if (error && !isMissingRelationError(error)) {
    console.warn('Admin activity log insert failed:', error.message);
  }
}

async function insertAddress(userId, addressData) {
  const addressPayload = {
    user_id: userId,
    house_no: addressData.house_no || null,
    street_address: addressData.street_address,
    city: addressData.city,
    state: addressData.state,
    pincode: addressData.pincode,
    formatted_address: addressData.formatted_address || null,
    latitude: addressData.latitude ? Number(addressData.latitude) : null,
    longitude: addressData.longitude ? Number(addressData.longitude) : null,
    location_source: addressData.latitude && addressData.longitude ? 'gps' : 'manual',
    is_default: false,
  };

  const { data, error } = await supabase.from('addresses').insert([addressPayload]).select().single();
  if (!error) return data;

  if (!isMissingColumnError(error)) throw error;

  // Compatibility path for legacy address schemas that do not have new GPS/house columns.
  const legacyPayload = {
    user_id: userId,
    street_address: addressPayload.house_no
      ? `${addressPayload.house_no}, ${addressPayload.street_address}`
      : addressPayload.street_address,
    city: addressPayload.city,
    state: addressPayload.state,
    pincode: addressPayload.pincode,
    is_default: false,
  };

  const { data: legacyData, error: legacyError } = await supabase
    .from('addresses')
    .insert([legacyPayload])
    .select()
    .single();

  if (legacyError) throw legacyError;
  return legacyData;
}

// PRODUCTS
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback to local data if DB tables are not created yet.
    console.warn('Supabase products fetch failed, using local data:', error.message);
    return localProducts.map((product) => ({
      ...product,
      image_url: product.image,
    }));
  }

  return data;
}

export async function createProduct(productData, actorId = null) {
  const { data, error } = await supabase.from('products').insert([productData]).select().single();
  if (error) throw error;
  await logAdminActivity({
    adminId: actorId,
    actionType: 'create',
    entityType: 'product',
    entityId: data?.id || null,
    details: { name: data?.name || productData?.name || '' },
  });
  return data;
}

export async function updateProduct(id, updates, actorId = null) {
  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
  if (error) throw error;
  await logAdminActivity({
    adminId: actorId,
    actionType: 'update',
    entityType: 'product',
    entityId: id,
    details: { fields: Object.keys(updates || {}) },
  });
  return data;
}

export async function deleteProduct(id, actorId = null) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  await logAdminActivity({
    adminId: actorId,
    actionType: 'delete',
    entityType: 'product',
    entityId: id,
  });
}

// ORDERS
export async function createOrder({ userId, items, addressData, totalAmount }) {
  const address = await insertAddress(userId, addressData);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{ user_id: userId, total_amount: totalAmount, delivery_address_id: address.id }])
    .select()
    .single();

  if (orderError) throw orderError;

  const itemRows = items.map((item) => ({
    order_id: order.id,
    product_id: item.product.id,
    quantity: item.quantity,
    price_at_time: item.product.price,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemRows);
  if (itemsError) throw itemsError;

  return order;
}

export async function fetchUserOrders(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*)), addresses(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles(full_name, phone_number), order_items(*), addresses(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId, status, deliveryAgentId = null, actorId = null) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (deliveryAgentId) updates.delivery_agent_id = deliveryAgentId;

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  await logAdminActivity({
    adminId: actorId,
    actionType: 'update_status',
    entityType: 'order',
    entityId: orderId,
    details: { status, delivery_agent_id: deliveryAgentId || null },
  });
  return data;
}

// PROFILES / USERS
export async function fetchAllUsers() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateUserRole(userId, role, actorId = null) {
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', userId).select().single();
  if (error) throw error;
  await logAdminActivity({
    adminId: actorId,
    actionType: 'update_role',
    entityType: 'profile',
    entityId: userId,
    details: { role },
  });
  return data;
}

export async function fetchAdminSettings() {
  const { data, error } = await supabase.from('admin_settings').select('*').order('key', { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertAdminSetting({ key, value, description = '', updatedBy = null }) {
  const payload = {
    key,
    value,
    description,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('admin_settings')
    .upsert(payload, { onConflict: 'key' })
    .select()
    .single();

  if (error) throw error;

  await logAdminActivity({
    adminId: updatedBy,
    actionType: 'upsert_setting',
    entityType: 'admin_setting',
    entityId: key,
    details: { key },
  });

  return data;
}

export async function fetchAdminActivityLogs(limit = 80) {
  const { data, error } = await supabase
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  if (updates.full_name) {
    await supabase.auth.updateUser({ data: { full_name: updates.full_name } });
  }

  let currentRole = 'user';
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    currentRole = existingProfile?.role || currentRole;
  } catch (error) {
    console.warn('Role lookup skipped:', error.message);
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const role = getEffectiveRole(authUser, updates.role || currentRole);
  const updatePayload = { ...updates, role };

  // Try UPDATE first so normal name edits work even if INSERT policy is missing.
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (!updateError && updatedProfile) {
    return updatedProfile;
  }

  if (updateError && updateError.code !== 'PGRST116') {
    console.warn('Profile update path failed, trying upsert:', updateError.message);
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updatePayload })
    .select()
    .single();

  if (error) {
    console.warn('DB updateProfile skipped (tables might be missing):', error.message);
    return { id: userId, ...updates, role };
  }

  return data;
}
