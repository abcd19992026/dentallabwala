import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client'
import type { DentalLabClient, CreateClientInput, UpdateClientInput } from '../types/client'

const LOCAL_STORAGE_KEY = 'dlw_super_admin_clients'

// Mock clients for fallback when Supabase is not connected
const MOCK_CLIENTS: DentalLabClient[] = [
  {
    id: 'lab-101',
    labName: 'Apex Dental Craft',
    ownerName: 'Dr. Rajesh Sharma',
    email: 'apex.craft@example.com',
    mobileNumber: '+91 98765 43210',
    address: 'Suite 402, Medical Enclave, Mumbai',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lab-102',
    labName: 'Precision Crown & Bridge Lab',
    ownerName: 'Anita Roy',
    email: 'contact@precisioncrown.com',
    mobileNumber: '+91 98123 45678',
    address: 'Plot 12, Industrial Area Phase II, Delhi',
    isActive: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

function getLocalClients(): DentalLabClient[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(MOCK_CLIENTS))
    return MOCK_CLIENTS
  }
  try {
    return JSON.parse(data)
  } catch {
    return MOCK_CLIENTS
  }
}

function saveLocalClients(clients: DentalLabClient[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clients))
}

/**
 * Fetch all Dental Lab clients from `labs` table
 */
export async function getClients(): Promise<DentalLabClient[]> {
  if (!isSupabaseConfigured) {
    return getLocalClients()
  }

  try {
    const { data, error, status } = await supabase
      .from('labs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      if (status === 404 || error.code === '42P01') {
        console.warn("Table 'labs' does not exist in Supabase yet. Falling back to local storage.")
        return getLocalClients()
      }
      throw error
    }

    return (data || []).map((row) => ({
      id: row.id,
      labName: row.lab_name || row.name || 'Unnamed Lab',
      ownerName: row.owner_name || '',
      email: row.email || '',
      mobileNumber: row.mobile || row.mobile_number || '',
      address: row.address || '',
      templateAFrontUrl: row.template_a_front || row.template_a_front_url || '',
      templateABackUrl: row.template_a_back || row.template_a_back_url || '',
      templateBFrontUrl: row.template_b_front || row.template_b_front_url || '',
      templateBBackUrl: row.template_b_back || row.template_b_back_url || '',
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
    }))
  } catch (err) {
    console.warn('Supabase fetch labs failed, falling back to local storage:', err)
    return getLocalClients()
  }
}

/**
 * Add a new Dental Lab client.
 * 1. Creates user + lab via the create-client Edge Function
 * 2. Uploads template files to Supabase Storage
 * 3. Updates the lab record with template URLs
 */
export async function createClient(input: CreateClientInput): Promise<DentalLabClient> {
  const labName = input.labName?.trim() || 'New Dental Lab'
  const ownerName = input.ownerName?.trim() || labName
  const email = input.email?.trim() || ''
  const password = input.password?.trim() || ''
  const templateFiles: Record<string, File> = {}
  if (input.templateAFrontFile) templateFiles['template_a_front'] = input.templateAFrontFile
  if (input.templateABackFile) templateFiles['template_a_back'] = input.templateABackFile
  if (input.templateBFrontFile) templateFiles['template_b_front'] = input.templateBFrontFile
  if (input.templateBBackFile) templateFiles['template_b_back'] = input.templateBBackFile

  if (!isSupabaseConfigured) {
    const clients = getLocalClients()
    const newClient: DentalLabClient = {
      id: 'lab-' + Date.now(),
      labName,
      ownerName: input.ownerName || '',
      email,
      mobileNumber: input.mobileNumber || '',
      address: input.address || '',
      templateAFrontUrl: input.templateAFrontUrl || '',
      templateABackUrl: input.templateABackUrl || '',
      templateBFrontUrl: input.templateBFrontUrl || '',
      templateBBackUrl: input.templateBBackUrl || '',
      isActive: input.isActive ?? true,
      createdAt: new Date().toISOString(),
    }
    clients.unshift(newClient)
    saveLocalClients(clients)
    return newClient
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  if (!supabaseUrl) {
    throw new Error('Supabase is not configured.')
  }

  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) {
    throw new Error('You must be logged in as Super Admin to create a client.')
  }

  // Step 1: Create auth user + lab via the Edge Function (without template URLs)
  const response = await fetch(`${supabaseUrl}/functions/v1/create-client`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      labName,
      ownerName,
      email,
      password,
      mobileNumber: input.mobileNumber?.trim() || '',
      address: input.address?.trim() || '',
      isActive: input.isActive ?? true,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    const errorMsg = result?.error || `Request failed with status ${response.status}`
    throw new Error(errorMsg)
  }

  const labId: string = result.data.id

  // Step 2: Upload template files to Supabase Storage (client-specific path)
  const TEMPLATE_FILE_NAMES: Record<string, string> = {
    'template_a_front': 'template-a-front',
    'template_a_back': 'template-a-back',
    'template_b_front': 'template-b-front',
    'template_b_back': 'template-b-back',
  }

  const uploadedUrls: Record<string, string> = {}
  const uploadedPaths: string[] = []

  if (Object.keys(templateFiles).length > 0) {
    for (const [columnName, file] of Object.entries(templateFiles)) {
      const fileName = TEMPLATE_FILE_NAMES[columnName] || columnName
      const ext = file.name.split('.').pop() || 'png'
      const storagePath = `${labId}/${fileName}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('template')
        .upload(storagePath, file, { upsert: true })
      console.log("UPLOAD PATH:", storagePath)
      console.log("UPLOAD ERROR:", uploadError)

      if (uploadError) {
        for (const path of uploadedPaths) {
          await supabase.storage.from('template').remove([path]).catch(() => { })
        }
        throw new Error(`Failed to upload ${columnName}: ${uploadError.message}`)
      }

      uploadedPaths.push(storagePath)

      uploadedUrls[columnName] = storagePath
    }

    // Step 3: Update the lab record with the uploaded template URLs
    const updates: Record<string, string> = {}
    for (const [columnName, url] of Object.entries(uploadedUrls)) {
      updates[columnName] = url
    }
    console.log("Lab ID:", labId);
    console.log("SAVING TEMPLATE DATA:", {
      lab_id: labId,
      template_a_front: uploadedUrls['template_a_front'],
      template_a_back: uploadedUrls['template_a_back'],
      template_b_front: uploadedUrls['template_b_front'],
      template_b_back: uploadedUrls['template_b_back'],
    })
    const { error: updateError } = await supabase
      .from('warranty_templates')
      .upsert({
        lab_id: labId,
        template_a_front: uploadedUrls['template_a_front'] || null,
        template_a_back: uploadedUrls['template_a_back'] || null,
        template_b_front: uploadedUrls['template_b_front'] || null,
        template_b_back: uploadedUrls['template_b_back'] || null,
      }, {
        onConflict: 'lab_id'
      })
    console.log("UPSERT ERROR:", updateError)
    if (updateError) {
      console.error("UPSERT ERROR:", updateError);
      for (const path of uploadedPaths) {
        await supabase.storage.from('template').remove([path]).catch(() => { })
      }
      throw new Error(`Failed to save template URLs: ${updateError.message}`)
    }

    // Also update the labs table so getClients() returns the correct paths
    const { error: labsUpdateError } = await supabase
      .from('labs')
      .update({
        template_a_front: uploadedUrls['template_a_front'] || null,
        template_a_back: uploadedUrls['template_a_back'] || null,
        template_b_front: uploadedUrls['template_b_front'] || null,
        template_b_back: uploadedUrls['template_b_back'] || null,
      })
      .eq('id', labId)

    if (labsUpdateError) {
      console.error('Failed to sync template paths to labs table:', labsUpdateError)
    }
  }

  return {
    id: result.data.id,
    labName: result.data.labName,
    ownerName: result.data.ownerName,
    email: result.data.email,
    mobileNumber: result.data.mobileNumber,
    address: result.data.address,
    templateAFrontUrl: uploadedUrls['template_a_front'] || '',
    templateABackUrl: uploadedUrls['template_a_back'] || '',
    templateBFrontUrl: uploadedUrls['template_b_front'] || '',
    templateBBackUrl: uploadedUrls['template_b_back'] || '',
    isActive: result.data.isActive,
    createdAt: result.data.createdAt,
  }
}

/**
 * Permanently delete a Dental Lab client.
 * Deletes: auth user, profile, lab record, and storage files.
 */
export async function deleteClient(labId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const clients = getLocalClients()
    saveLocalClients(clients.filter((c) => c.id !== labId))
    return
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  if (!supabaseUrl) {
    throw new Error('Supabase is not configured.')
  }

  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) {
    throw new Error('You must be logged in as Super Admin to delete a client.')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-client`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ labId }),
  })

  const result = await response.json()

  if (!response.ok) {
    const errorMsg = result?.error || `Delete request failed with status ${response.status}`
    throw new Error(errorMsg)
  }
}

/**
 *  an existing Dental Lab client in `labs` table
 */
export async function updateClient(
  clientId: string,
  input: UpdateClientInput
): Promise<void> {
  if (!isSupabaseConfigured) {
    const clients = getLocalClients()
    const index = clients.findIndex((c) => c.id === clientId)
    if (index !== -1) {
      clients[index] = { ...clients[index], ...input }
      saveLocalClients(clients)
    }
    return
  }

  // Check if template File objects were provided (meaning user selected new files)
  const formInput = input as CreateClientInput
  const templateFiles: Record<string, File> = {}
  if (formInput.templateAFrontFile) templateFiles['template_a_front'] = formInput.templateAFrontFile
  if (formInput.templateABackFile) templateFiles['template_a_back'] = formInput.templateABackFile
  if (formInput.templateBFrontFile) templateFiles['template_b_front'] = formInput.templateBFrontFile
  if (formInput.templateBBackFile) templateFiles['template_b_back'] = formInput.templateBBackFile

  const uploadedStoragePaths: Record<string, string> = {}

  if (Object.keys(templateFiles).length > 0) {
    const TEMPLATE_FILE_NAMES: Record<string, string> = {
      'template_a_front': 'template-a-front',
      'template_a_back': 'template-a-back',
      'template_b_front': 'template-b-front',
      'template_b_back': 'template-b-back',
    }

    for (const [columnName, file] of Object.entries(templateFiles)) {
      const fileName = TEMPLATE_FILE_NAMES[columnName] || columnName
      const ext = file.name.split('.').pop() || 'png'
      const storagePath = `${clientId}/${fileName}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('template')
        .upload(storagePath, file, { upsert: true })

      if (uploadError) {
        throw new Error(`Failed to upload ${columnName}: ${uploadError.message}`)
      }

      uploadedStoragePaths[columnName] = storagePath
    }
  }

  // Build labs table updates
  const updates: Record<string, any> = {}
  if (input.labName !== undefined) updates.lab_name = input.labName
  if (input.ownerName !== undefined) updates.owner_name = input.ownerName
  if (input.email !== undefined) updates.email = input.email
  if (input.mobileNumber !== undefined) updates.mobile = input.mobileNumber
  if (input.address !== undefined) updates.address = input.address
  if (input.isActive !== undefined) updates.is_active = input.isActive

  // Use uploaded storage paths when user provided new files, otherwise fall back to existing URL values
  const templateAFront = uploadedStoragePaths['template_a_front'] ?? (input.templateAFrontUrl !== undefined ? input.templateAFrontUrl : undefined)
  const templateABack = uploadedStoragePaths['template_a_back'] ?? (input.templateABackUrl !== undefined ? input.templateABackUrl : undefined)
  const templateBFront = uploadedStoragePaths['template_b_front'] ?? (input.templateBFrontUrl !== undefined ? input.templateBFrontUrl : undefined)
  const templateBBack = uploadedStoragePaths['template_b_back'] ?? (input.templateBBackUrl !== undefined ? input.templateBBackUrl : undefined)

  if (templateAFront !== undefined) updates.template_a_front = templateAFront
  if (templateABack !== undefined) updates.template_a_back = templateABack
  if (templateBFront !== undefined) updates.template_b_front = templateBFront
  if (templateBBack !== undefined) updates.template_b_back = templateBBack

  const { error } = await supabase.from('labs').update(updates).eq('id', clientId)
  if (error) throw error

  // Sync warranty_templates with the same values
  const warrantyValues: Record<string, any> = { lab_id: clientId }
  if (templateAFront !== undefined) warrantyValues['template_a_front'] = templateAFront
  if (templateABack !== undefined) warrantyValues['template_a_back'] = templateABack
  if (templateBFront !== undefined) warrantyValues['template_b_front'] = templateBFront
  if (templateBBack !== undefined) warrantyValues['template_b_back'] = templateBBack

  if (Object.keys(warrantyValues).length > 1) {
    const { error: templateError } = await supabase
      .from('warranty_templates')
      .upsert(warrantyValues, { onConflict: 'lab_id' })

    if (templateError) throw templateError
  }
}

/**
 * Activate or Deactivate a Client
 */
export async function toggleClientStatus(
  clientId: string,
  currentStatus: boolean
): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

  const { data: { session } } = await supabase.auth.getSession()

  const accessToken = session?.access_token

  if (!accessToken) {
    throw new Error('You must be logged in as Super Admin.')
  }


  if (currentStatus === true) {

    const response = await fetch(
      `${supabaseUrl}/functions/v1/deactivate-client`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          labId: clientId,
        }),
      }
    )


    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error || 'Failed to deactivate client')
    }

    return false
  }


  await updateClient(clientId, {
    isActive: true,
  })

  return true
}

/**
 * Reset Client Password
 */
export async function resetClientPassword(clientId: string, newPassword: string): Promise<void> {
  if (!isSupabaseConfigured) {
    console.log(`[Mock Reset Password] Password reset for client ${clientId}`)
    return
  }

  // Find user_id from profiles table where lab_id = clientId
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('lab_id', clientId)
    .single()

  if (profileError || !profile?.id) {
    throw new Error(`Profile not found for client ID ${clientId}`)
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  })

  if (error) {
    throw new Error(`Password reset failed: ${error.message}`)
  }
}
