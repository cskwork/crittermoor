// CRC32 (IEEE 802.3 polynomial 0xEDB88320). Pure, deterministic, no deps.
// Used to detect save-blob corruption.

let TABLE: Uint32Array | null = null

function table(): Uint32Array {
  if (TABLE) return TABLE
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    t[i] = c >>> 0
  }
  TABLE = t
  return t
}

export function crc32String(s: string): number {
  const t = table()
  let c = 0xffffffff
  for (let i = 0; i < s.length; i++) {
    c = t[(c ^ s.charCodeAt(i)) & 0xff]! ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

export function crc32Bytes(bytes: Uint8Array): number {
  const t = table()
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c = t[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}
