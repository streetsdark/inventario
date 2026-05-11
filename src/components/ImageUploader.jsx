import { useState } from "react"
import { BsImages } from "react-icons/bs"
import { uploadImage } from "../lib/cloudinary"

export default function ImageUploader({ value, onChange }) {
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file) => {
    if (!file) return

    setLoading(true)

    try {
      const url = await uploadImage(file)
      onChange(url)
    } catch (error) {
      console.error("Error subiendo imagen:", error)
    }

    setLoading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)

    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: dragging ? "2px dashed #00aaff" : "2px dashed #ccc",
        padding: "20px",
        textAlign: "center",
        borderRadius: "10px",
        cursor: "pointer"
      }}
    >
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        id="upload-input"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      <label htmlFor="upload-input" style={{ cursor: "pointer" }}>
        {loading ? (
          <p>Subiendo imagen...</p>
        ) : value ? (
          <img
            src={value}
            alt="preview"
            style={{ width: 120, borderRadius: 8 }}
          />
        ) : (
          <>
            <BsImages size={50} />
            <p>Arrastra o haz click para subir imagen</p>
          </>
        )}
      </label>
    </div>
  )
}