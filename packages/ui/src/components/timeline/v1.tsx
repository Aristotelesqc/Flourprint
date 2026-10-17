import './v1.css';
import React from 'react';
import { library } from '../../index.ts';
import type { TimelineProps } from '../../props.ts';
const Timeline = ({ startLabel, endLabel, lanes }: TimelineProps) => (
  <section className="fp-timeline" data-fp-component="fp.timeline" data-fp-version="v1">
    <div className="timeline-axis">
      <span>{startLabel}</span>
      <span>{endLabel}</span>
    </div>
    {lanes.map((lane) => (
      <div className="timeline-lane" key={lane.id}>
        <strong>{lane.label}</strong>
        <div className="timeline-track">
          {lane.events.map((event) => (
            <span
              key={event.id}
              className="timeline-event"
              role="img"
              aria-label={`${event.label} · ${event.range}`}
              title={`${event.label} · ${event.range}`}
              style={{ left: `${event.startPct}%`, width: `${event.endPct - event.startPct}%` }}
            />
          ))}
        </div>
        <div className="timeline-event-labels">
          {lane.events.map((event) => (
            <span key={event.id}>
              {event.label} · {event.range}
            </span>
          ))}
        </div>
      </div>
    ))}
  </section>
);
export default library.version({
  id: 'fp.timeline',
  version: 'v1',
  component: Timeline,
  notes:
    'Display-only lanes. Positions and localized times arrive from the consumer projection; this component schedules nothing.',
  examples: [
    {
      name: 'Parallel steps',
      props: {
        startLabel: '08:00',
        endLabel: '12:00',
        lanes: [
          {
            id: 'component',
            label: 'Tangzhong',
            events: [
              { id: 'scald', label: 'Scald', range: '08:00–08:15', startPct: 0, endPct: 6.25 },
            ],
          },
          {
            id: 'dough',
            label: 'Final dough',
            events: [
              { id: 'mix', label: 'Mix', range: '08:15–08:30', startPct: 6.25, endPct: 12.5 },
              { id: 'bulk', label: 'Bulk', range: '08:30–12:00', startPct: 12.5, endPct: 100 },
            ],
          },
        ],
      },
    },
  ],
});
