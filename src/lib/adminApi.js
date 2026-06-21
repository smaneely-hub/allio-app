import { supabase } from './supabase'

async function invoke(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) throw error
  return data
}

export async function loadAdminOverview() {
  return invoke('admin-overview')
}

export async function loadAdminUsers(query = '') {
  return invoke('admin-users-list', { query })
}

export async function loadAdminUserDetail(userId) {
  return invoke('admin-user-detail', { userId })
}

export async function deleteAdminUser(userId) {
  return invoke('admin-user-delete', { userId })
}
