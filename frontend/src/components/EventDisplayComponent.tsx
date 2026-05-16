import DataManager from '../services/DataManager'
import type { Event } from '../types/FrameDataInterfaces'
import { useEffect } from 'react'

function EventDisplayComponent({eventsData}: {eventsData: Map<number, Event[]>}) {

  useEffect(() => {
    console.log('Events Data in display:', eventsData)
  }, [eventsData])

  return (
    <div>
      <h2>{JSON.stringify(Array.from(eventsData.entries()))}</h2>
      {/* Placeholder for event display content */}
    </div>
  );
}

export default EventDisplayComponent;