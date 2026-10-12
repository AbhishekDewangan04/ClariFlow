import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <Card reveal className="mt-4">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That page doesn't exist. Head back to the overview or look up an order."
        action={
          <div className="flex gap-2">
            <Button as={Link} to="/" size="sm">Go to Overview</Button>
            <Button as={Link} to="/orders" variant="secondary" size="sm">Find an order</Button>
          </div>
        }
        className="py-20"
      />
    </Card>
  )
}
