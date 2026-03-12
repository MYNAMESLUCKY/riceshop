import { supabase } from './supabase';
import { products as localProducts } from '../data/products';
import { getEffectiveRole } from './authz';

// ── Image Upload ─────────────────────────────────────────────
export async function uploadProductImage(file) {
  const ext = file.name.split('.').pop();
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

// ── Notifications ─────────────────────────────────────────────
export async function fetchUserNotifications(userId, limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

// ── Store Location & Delivery Radius ─────────────────────────
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns { address, lat, lng, delivery_radius_km } or null if not configured */
export async function getStoreLocation() {
  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'store_location')
    .maybeSingle();
  return data?.value || null;
}

/** Returns true if the coords are within the store's delivery radius */
export async function isWithinDeliveryRadius(customerLat, customerLng) {
  const store = await getStoreLocation();
  if (!store?.lat || !store?.lng) return true; // no restriction configured → allow all
  const dist = haversineKm(store.lat, store.lng, customerLat, customerLng);
  const radius = store.delivery_radius_km || 10;
  return dist <= radius;
}


// ── Serviceable Pincodes ─────────────────────────────────────
export async function checkPincodeServiceable(pincode) {
  const { data, error } = await supabase
    .from('serviceable_pincodes')
    .select('pincode, city, state, delivery_zones(name, delivery_fee, free_above, est_hours_min, est_hours_max)')
    .eq('pincode', pincode.trim())
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

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

const missingTables = new Set();
const missingTableWarnings = new Set();

function markMissingTable(tableName, error) {
  missingTables.add(tableName);
  if (!missingTableWarnings.has(tableName)) {
    missingTableWarnings.add(tableName);
    console.warn(
      `Supabase table "${tableName}" is missing. Run src/lib/database.sql in Supabase SQL Editor.`,
      error?.message || ''
    );
  }
}

function isTableKnownMissing(tableName) {
  return missingTables.has(tableName);
}

function handleMissingTableError(tableName, error) {
  if (!isMissingRelationError(error)) return false;
  markMissingTable(tableName, error);
  return true;
}

async function logAdminActivity({ adminId, actionType, entityType, entityId = null, details = {} }) {
  if (!adminId) return;
  if (isTableKnownMissing('admin_activity_logs')) return;

  const { error } = await supabase.from('admin_activity_logs').insert([
    {
      admin_id: adminId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      details,
    },
  ]);

  if (handleMissingTableError('admin_activity_logs', error)) return;

  if (error) {
    console.warn('Admin activity log insert failed:', error.message);
  }
}

async function insertAddress(userId, addressData) {
  if (isTableKnownMissing('addresses')) {
    throw new Error('Addresses table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }

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

  if (handleMissingTableError('addresses', error)) {
    throw new Error('Addresses table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }

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

  if (handleMissingTableError('addresses', legacyError)) {
    throw new Error('Addresses table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }

  if (legacyError) throw legacyError;
  return legacyData;
}

// PRODUCTS
export async function fetchProducts() {
  if (isTableKnownMissing('products')) {
    return localProducts.map((product) => ({
      ...product,
      image_url: product.image,
    }));
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    if (handleMissingTableError('products', error)) {
      return localProducts.map((product) => ({
        ...product,
        image_url: product.image,
      }));
    }

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
  if (isTableKnownMissing('products')) {
    throw new Error('Products table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }
  const { data, error } = await supabase.from('products').insert([productData]).select().single();
  if (handleMissingTableError('products', error)) {
    throw new Error('Products table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }
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
  if (isTableKnownMissing('products')) {
    throw new Error('Products table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }
  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
  if (handleMissingTableError('products', error)) {
    throw new Error('Products table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }
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
  if (isTableKnownMissing('products')) {
    throw new Error('Products table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (handleMissingTableError('products', error)) {
    throw new Error('Products table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }
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
  if (isTableKnownMissing('orders') || isTableKnownMissing('order_items') || isTableKnownMissing('addresses')) {
    throw new Error('Order tables are not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }

  const address = await insertAddress(userId, addressData);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{ user_id: userId, total_amount: totalAmount, delivery_address_id: address.id }])
    .select()
    .single();

  if (handleMissingTableError('orders', orderError)) {
    throw new Error('Orders table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }

  if (orderError) throw orderError;

  const itemRows = items.map((item) => ({
    order_id: order.id,
    product_id: item.product.id,
    quantity: item.quantity,
    price_at_time: item.product.price,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemRows);
  if (handleMissingTableError('order_items', itemsError)) {
    throw new Error('Order items table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }
  if (itemsError) throw itemsError;

  return order;
}

export async function fetchUserOrders(userId) {
  if (isTableKnownMissing('orders')) {
    return [];
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*)), addresses(*), customer:profiles!user_id(full_name, phone_number)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (handleMissingTableError('orders', error)) {
    return [];
  }

  if (error) throw error;
  return data;
}

export async function fetchAllOrders() {
  if (isTableKnownMissing('orders')) {
    return [];
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles!user_id(full_name, phone_number), order_items(*), addresses(*)')
    .order('created_at', { ascending: false });

  if (handleMissingTableError('orders', error)) {
    return [];
  }

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId, status, deliveryAgentId = null, actorId = null) {
  if (isTableKnownMissing('orders')) {
    throw new Error('Orders table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }

  const updates = { status, updated_at: new Date().toISOString() };
  if (deliveryAgentId) updates.delivery_agent_id = deliveryAgentId;

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (handleMissingTableError('orders', error)) {
    throw new Error('Orders table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }

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
  if (isTableKnownMissing('profiles')) {
    return [];
  }

  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (handleMissingTableError('profiles', error)) {
    return [];
  }
  if (error) throw error;
  return data;
}

export async function updateUserRole(userId, role, actorId = null) {
  if (isTableKnownMissing('profiles')) {
    throw new Error('Profiles table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', userId).select().single();
  if (handleMissingTableError('profiles', error)) {
    throw new Error('Profiles table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }
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
  if (isTableKnownMissing('admin_settings')) {
    return [];
  }
  const { data, error } = await supabase.from('admin_settings').select('*').order('key', { ascending: true });
  if (handleMissingTableError('admin_settings', error)) {
    return [];
  }
  if (error) throw error;
  return data;
}

export async function upsertAdminSetting({ key, value, description = '', updatedBy = null }) {
  if (isTableKnownMissing('admin_settings')) {
    throw new Error('Admin settings table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }

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

  if (handleMissingTableError('admin_settings', error)) {
    throw new Error('Admin settings table is not set up. Run src/lib/database.sql in Supabase SQL Editor.');
  }

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
  if (isTableKnownMissing('admin_activity_logs')) {
    return [];
  }

  const { data, error } = await supabase
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (handleMissingTableError('admin_activity_logs', error)) {
    return [];
  }

  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  if (updates.full_name) {
    await supabase.auth.updateUser({ data: { full_name: updates.full_name } });
  }

  let currentRole = 'user';
  let profileTableMissing = isTableKnownMissing('profiles');

  try {
    if (!profileTableMissing) {
      const { data: existingProfile, error: roleLookupError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (handleMissingTableError('profiles', roleLookupError)) {
        profileTableMissing = true;
      } else {
        if (roleLookupError) throw roleLookupError;
        currentRole = existingProfile?.role || currentRole;
      }
    }
  } catch (error) {
    console.warn('Role lookup skipped:', error.message);
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const role = getEffectiveRole(authUser, updates.role || currentRole);
  const updatePayload = { ...updates, role };

  if (profileTableMissing) {
    return {
      id: userId,
      full_name: updates.full_name || authUser?.user_metadata?.full_name || '',
      role,
    };
  }

  // Try UPDATE first so normal name edits work even if INSERT policy is missing.
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (handleMissingTableError('profiles', updateError)) {
    return {
      id: userId,
      full_name: updates.full_name || authUser?.user_metadata?.full_name || '',
      role,
    };
  }

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

  if (handleMissingTableError('profiles', error)) {
    return {
      id: userId,
      full_name: updates.full_name || authUser?.user_metadata?.full_name || '',
      role,
    };
  }

  if (error) {
    console.warn('DB updateProfile skipped (tables might be missing):', error.message);
    return { id: userId, ...updates, role };
  }

  return data;
}
