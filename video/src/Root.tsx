import { Composition, Series } from 'remotion'
import { FPS } from './anim'
import { Act0 } from './act0/Act0'
import { ACT0_DURATION } from './act0/timeline'
import { ACT2_DURATION, Act2 } from './act2/Act2'
import { ACT3_DURATION, Act3 } from './act3/Act3'
import { ACT4_DURATION, Act4 } from './act4/Act4'

// Act 0 ends on black with the TV off; Act 2 picks up on the viewer's laptop. (There is no Act 1: the analysis
// room was cut.)
const Hero = () => (
  <Series>
    <Series.Sequence durationInFrames={ACT0_DURATION}>
      <Act0 />
    </Series.Sequence>
    <Series.Sequence durationInFrames={ACT2_DURATION}>
      <Act2 />
    </Series.Sequence>
    <Series.Sequence durationInFrames={ACT3_DURATION}>
      <Act3 />
    </Series.Sequence>
    <Series.Sequence durationInFrames={ACT4_DURATION}>
      <Act4 />
    </Series.Sequence>
  </Series>
)

const size = { fps: FPS, width: 1920, height: 1080 }

export const RemotionRoot = () => (
  <>
    <Composition id="Hero" component={Hero} durationInFrames={ACT0_DURATION + ACT2_DURATION + ACT3_DURATION + ACT4_DURATION} {...size} />
    <Composition id="Act0" component={Act0} durationInFrames={ACT0_DURATION} {...size} />
    <Composition id="Act2" component={Act2} durationInFrames={ACT2_DURATION} {...size} />
    <Composition id="Act3" component={Act3} durationInFrames={ACT3_DURATION} {...size} />
    <Composition id="Act4" component={Act4} durationInFrames={ACT4_DURATION} {...size} />
  </>
)
