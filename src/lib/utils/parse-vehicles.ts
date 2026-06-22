export function parseVehicles(
  formData: FormData,
): Array<{ licensePlate: string; make: string; model: string }> {
  const vehicles: Array<{ licensePlate: string; make: string; model: string }> = []
  for (let i = 0; i < 2; i++) {
    const plate = formData.get(`vehicle${i}LicensePlate`) as string | null
    const make = formData.get(`vehicle${i}Make`) as string | null
    const model = formData.get(`vehicle${i}Model`) as string | null
    if (plate && make && model) vehicles.push({ licensePlate: plate, make, model })
  }
  return vehicles
}
