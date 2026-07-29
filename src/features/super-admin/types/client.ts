export interface DentalLabClient {
  id: string
  labName: string
  ownerName?: string
  email?: string
  mobileNumber?: string
  address?: string
  templateAFrontUrl?: string
  templateABackUrl?: string
  templateBFrontUrl?: string
  templateBBackUrl?: string
  isActive: boolean
  createdAt: string
}

export type CreateClientInput = {
  labName?: string
  ownerName?: string
  email?: string
  mobileNumber?: string
  address?: string
  templateAFrontUrl?: string
  templateABackUrl?: string
  templateBFrontUrl?: string
  templateBBackUrl?: string
  templateAFrontFile?: File | null
  templateABackFile?: File | null
  templateBFrontFile?: File | null
  templateBBackFile?: File | null
  password?: string
  isActive?: boolean
}

export type UpdateClientInput = Partial<Omit<DentalLabClient, 'id' | 'createdAt'>>
