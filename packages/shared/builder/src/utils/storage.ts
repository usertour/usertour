const INIT_STORAGE_KEY = "usertour-crx:app:init"

export type INIT_PARAMS = {
  token?: string
  environmentId?: string
  contentId?: string
  action?: string
  idempotentKey?: string
  url?: string
}

export const getInitParams = (): INIT_PARAMS | null => {
  const sessioninitParams = sessionStorage.getItem(INIT_STORAGE_KEY)
  if (sessioninitParams) {
    return JSON.parse(sessioninitParams) as INIT_PARAMS
  }
  return null
}

export const setInitParams = (params: INIT_PARAMS) => {
  sessionStorage.setItem(INIT_STORAGE_KEY, JSON.stringify(params))
}

export const updateInitParams = (params: Partial<INIT_PARAMS>) => {
  const pres = getInitParams() ?? {}
  setInitParams({ ...pres, ...params })
}

export const getAuthToken = () => {
  const params = getInitParams()
  return params?.token ?? null
}
