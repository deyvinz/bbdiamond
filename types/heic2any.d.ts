declare module 'heic2any' {
  interface ConversionOptions {
    blob: Blob | File
    toType?: string
    quality?: number
  }

  type ConversionResult = Blob | Blob[]

  function heic2any(options: ConversionOptions): Promise<ConversionResult>

  export = heic2any
}
