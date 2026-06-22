'use client'

export interface VehicleEntry {
  licensePlate: string
  make: string
  model: string
}

interface VehicleFieldsProps {
  vehicles: VehicleEntry[]
  onChange: (vehicles: VehicleEntry[]) => void
}

export function VehicleFields({ vehicles, onChange }: VehicleFieldsProps) {
  function update(index: number, field: keyof VehicleEntry, value: string) {
    const updated = vehicles.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    onChange(updated)
  }

  function addVehicle() {
    if (vehicles.length < 2) onChange([...vehicles, { licensePlate: '', make: '', model: '' }])
  }

  function removeVehicle(index: number) {
    onChange(vehicles.filter((_, i) => i !== index))
  }

  return (
    <div>
      {vehicles.map((v, i) => (
        <div key={i}>
          <input
            name={`vehicle${i}LicensePlate`}
            value={v.licensePlate}
            onChange={(e) => update(i, 'licensePlate', e.target.value)}
            placeholder="License plate"
            required
          />
          <input
            name={`vehicle${i}Make`}
            value={v.make}
            onChange={(e) => update(i, 'make', e.target.value)}
            placeholder="Make"
            required
          />
          <input
            name={`vehicle${i}Model`}
            value={v.model}
            onChange={(e) => update(i, 'model', e.target.value)}
            placeholder="Model"
            required
          />
          <button type="button" onClick={() => removeVehicle(i)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={addVehicle} disabled={vehicles.length >= 2}>
        Add vehicle
      </button>
    </div>
  )
}
