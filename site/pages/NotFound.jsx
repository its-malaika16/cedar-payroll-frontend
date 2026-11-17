import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main style={{ maxWidth: 640, margin: '64px auto', padding: 24, color: '#17375e' }}>
      <h1>Page not found</h1>
      <p>This address is not a page on Cedar Payroll.</p>
      <p>
        <Link to="/">Home</Link>
        {' · '}
        <Link to="/contact">Contact</Link>
        {' · '}
        <Link to="/privacy">Privacy</Link>
      </p>
    </main>
  )
}
