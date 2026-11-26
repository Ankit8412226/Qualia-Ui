import { AddressBook, ChartPieSlice, ClockCounterClockwise, EnvelopeSimple, Megaphone, PhoneIncoming, PhoneOutgoing, Plugs, Prohibit, Tag, Waveform, Wrench } from '@phosphor-icons/react';

export const nav = {
  groups: [
    {
      label: 'Calling',
      items: [
        { to: '/agentflow', end: true, label: 'Overview', icon: ChartPieSlice },
        { to: '/agentflow/campaigns', label: 'Campaigns', icon: Megaphone, badge: 3 },
        { to: '/agentflow/test-call', label: 'Test call', icon: PhoneOutgoing, keywords: 'outbound try' },
        { to: '/agentflow/inbound', label: 'Inbound', icon: PhoneIncoming },
        { to: '/agentflow/calls', label: 'Call history', icon: ClockCounterClockwise },
      ],
    },
    {
      label: 'Library',
      items: [
        { to: '/agentflow/contacts', label: 'Contacts', icon: AddressBook },
        { to: '/agentflow/dispositions', label: 'Dispositions', icon: Tag },
        { to: '/agentflow/voices', label: 'Voices', icon: Waveform },
        { to: '/agentflow/dnc', label: 'Do Not Call', icon: Prohibit },
      ],
    },
    {
      label: 'Setup',
      items: [
        { to: '/agentflow/integrations', label: 'Integrations', icon: Plugs },
        { to: '/agentflow/alerts', label: 'Email alerts', icon: EnvelopeSimple },
        { to: '/agentflow/tools', label: 'Tools', icon: Wrench },
      ],
    },
  ],
};
