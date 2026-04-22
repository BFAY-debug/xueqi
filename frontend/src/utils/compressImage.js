/**
 * Compress an image file using Canvas API.
 * Returns a new File with reduced dimensions and JPEG quality.
 */
export function compressImage(file, { maxWidth = 300, maxHeight = 300, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let w = img.width
      let h = img.height

      // Only scale down, never up
      if (w <= maxWidth && h <= maxHeight) {
        resolve(file)
        return
      }

      const ratio = Math.min(maxWidth / w, maxHeight / h)
      w = Math.round(w * ratio)
      h = Math.round(h * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to original if compression fails
            resolve(file)
            return
          }
          const ext = file.name.split('.').pop() || 'jpg'
          const compressed = new File([blob], `compressed.${ext}`, {
            type: blob.type || 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressed)
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
