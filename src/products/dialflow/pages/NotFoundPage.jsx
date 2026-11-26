import { Link } from 'react-router-dom';
import { Compass } from '@phosphor-icons/react';
import { Button, EmptyState } from '@/design-system';
import { Page } from '@/shared/layout';

export default function NotFoundPage() {
  return (
    <Page>
      <EmptyState icon={Compass} title="This page does not exist" description="The link may be old. Go back to DialFlow home." action={<Button as={Link} to="/dialflow" variant="brand">DialFlow home</Button>} />
    </Page>
  );
}
