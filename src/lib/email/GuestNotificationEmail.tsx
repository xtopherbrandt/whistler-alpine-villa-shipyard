import { Body, Container, Head, Html, Preview, Text } from '@react-email/components'

export interface GuestNotificationEmailProps {
  unitDescription: string
  guestName: string
  guestContact: string
  checkInDate: string   // 'YYYY-MM-DD'
  checkOutDate: string  // 'YYYY-MM-DD'
  registeredByName: string
  vehicles: Array<{ licensePlate: string; make: string; model: string }>
}

export function GuestNotificationEmail({
  unitDescription, guestName, guestContact,
  checkInDate, checkOutDate, registeredByName, vehicles,
}: GuestNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Guest stay registered for {unitDescription}</Preview>
      <Body>
        <Container>
          <Text>A guest stay has been registered for {unitDescription}.</Text>
          <Text>Guest: {guestName} — {guestContact}</Text>
          <Text>Dates: {checkInDate} → {checkOutDate}</Text>
          <Text>Registered by: {registeredByName}</Text>
          {vehicles.map((v, i) => (
            <Text key={i}>Vehicle {i + 1}: {v.make} {v.model} ({v.licensePlate})</Text>
          ))}
        </Container>
      </Body>
    </Html>
  )
}
