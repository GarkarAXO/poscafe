import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'poscafe_default_secret_key_change_in_production_2026'
)

export const AUTH_COOKIE_NAME = 'pos_session'

export interface UserPermissions {
  canAccessPOS: boolean
  canManageCatalog: boolean
  canManageInventory: boolean
  canManagePurchases: boolean
  canManageExpenses: boolean
  canManageCashRegisters: boolean
  canViewReports: boolean
  canManageUsers: boolean
  canManageSettings: boolean
  canAuthorizeDiscounts: boolean
  canAuthorizeCourtesies: boolean
  canAuthorizeCancellations: boolean
  canTransferTables: boolean
}

export interface AuthSession {
  userId: string
  name: string
  email?: string | null
  username?: string | null
  gender?: string | null
  isPlatformAdmin: boolean
  businessId?: string
  activeBranchId?: string
  roleCodes: string[]
  permissions: UserPermissions
}

export function mergePermissions(roles: Array<{ role: UserPermissions }>): UserPermissions {
  return roles.reduce<UserPermissions>(
    (acc, curr) => ({
      canAccessPOS: acc.canAccessPOS || curr.role.canAccessPOS,
      canManageCatalog: acc.canManageCatalog || curr.role.canManageCatalog,
      canManageInventory: acc.canManageInventory || curr.role.canManageInventory,
      canManagePurchases: acc.canManagePurchases || curr.role.canManagePurchases,
      canManageExpenses: acc.canManageExpenses || curr.role.canManageExpenses,
      canManageCashRegisters: acc.canManageCashRegisters || curr.role.canManageCashRegisters,
      canViewReports: acc.canViewReports || curr.role.canViewReports,
      canManageUsers: acc.canManageUsers || curr.role.canManageUsers,
      canManageSettings: acc.canManageSettings || curr.role.canManageSettings,
      canAuthorizeDiscounts: acc.canAuthorizeDiscounts || curr.role.canAuthorizeDiscounts,
      canAuthorizeCourtesies: acc.canAuthorizeCourtesies || curr.role.canAuthorizeCourtesies,
      canAuthorizeCancellations: acc.canAuthorizeCancellations || curr.role.canAuthorizeCancellations,
      canTransferTables: acc.canTransferTables || curr.role.canTransferTables,
    }),
    {
      canAccessPOS: false,
      canManageCatalog: false,
      canManageInventory: false,
      canManagePurchases: false,
      canManageExpenses: false,
      canManageCashRegisters: false,
      canViewReports: false,
      canManageUsers: false,
      canManageSettings: false,
      canAuthorizeDiscounts: false,
      canAuthorizeCourtesies: false,
      canAuthorizeCancellations: false,
      canTransferTables: false,
    }
  )
}

export async function signToken(payload: AuthSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AuthSession
  } catch {
    return null
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  if (!token) return null

  return verifyToken(token)
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}
