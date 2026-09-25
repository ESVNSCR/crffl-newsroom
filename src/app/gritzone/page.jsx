import GritZoneClient from './GritZoneClient';

export const metadata = {
  title: 'The GRITZone | CRFFL Times-Herald',
  description: 'Live 60-second CRFFL fantasy matchup tracking, win probability, and real-time manager War Room chat with Times-Herald columnists.',
  openGraph: {
    title: 'The GRITZone | CRFFL Times-Herald',
    description: 'Live 60-second fantasy matchup tracker & Owner War Room.',
  },
};

export default function GritZonePage() {
  return <GritZoneClient />;
}
