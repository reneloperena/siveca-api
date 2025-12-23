/**
 * Export catalog entry type
 */
export type ExportCatalogEntry = {
  catalogType: string
  deviceUuid: string
  bucketTs: Date
  format: string
  year: number
  month: number
  day: number
  hour: number | null
  path: string
  filename: string
  fromTs: Date
  toTs: Date
  rowCount: number
  sizeEstimate: number
  firstTime: Date | null
  lastTime: Date | null
  finalized: boolean
  createdAt: Date
  updatedAt: Date
  extras: Record<string, unknown>
}

/**
 * Parameters for catalog aggregation
 */
export type CatalogAggregationParams = {
  catalogType: string
  deviceUuid: string
  bucketTs: Date
  format: string
}

/**
 * WebDAV path components
 */
export type WebDavPathComponents = {
  year?: number
  month?: number
  day?: number
  hour?: number
  filename?: string
}
