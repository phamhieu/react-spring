import createMockRaf, { MockRaf } from 'mock-raf'
import * as Globals from 'shared/globals'
import { Controller } from './Controller'
import { FrameLoop } from './FrameLoop'

let mockRaf: MockRaf
beforeEach(() => {
  mockRaf = createMockRaf()
  Globals.assign({
    now: mockRaf.now,
    requestAnimationFrame: mockRaf.raf,
    cancelAnimationFrame: mockRaf.cancel,
    frameLoop: new FrameLoop(),
  })
})

it('can animate a number', () => {
  const ctrl = new Controller({ x: 0 })
  ctrl.update({ x: 100 }).start()

  const frames = getFrames(ctrl)
  expect(frames).toMatchSnapshot()

  // The first frame should be the from value.
  expect(frames[0]).toEqual({ x: 0 })

  // The last frame should be the goal value.
  expect(frames.slice(-1)[0]).toEqual({ x: 100 })
})

it('can animate an array of numbers', () => {
  const config = { precision: 0.005 }
  const ctrl = new Controller<{ x: [number, number] }>({ x: [1, 2], config })
  ctrl.update({ x: [5, 10] }).start()

  const frames = getFrames(ctrl)
  expect(frames).toMatchSnapshot()

  // The last frame should be the goal value.
  expect(frames.slice(-1)[0]).toEqual({ x: [5, 10] })

  // The 2nd value is always ~2x the 1st value (within the defined precision).
  const factors = frames.map(frame => frame.x[1] / frame.x[0])
  expect(
    factors.every(factor => Math.abs(2 - factor) < config.precision)
  ).toBeTruthy()
})

describe('async "to" prop', () => {
  it('acts strangely without the "from" prop', async () => {
    const ctrl = new Controller<{ x: number }>({
      to: async update => {
        // The animated node does not exist yet!
        expect(ctrl.animated.x).toBeUndefined()

        // Any values passed here are treated as "from" values,
        // because no "from" prop was ever given.
        let promise = update({ x: 1 })
        // Now the animated node exists!
        expect(ctrl.animated.x).toBeDefined()
        // But the animation is idle!
        expect(ctrl.animations.x.idle).toBeTruthy()
        await promise

        // This call *will* start an animation!
        promise = update({ x: 2 })
        expect(ctrl.animations.x.idle).toBeFalsy()
        await promise
      },
    })

    // Animated nodes are not created synchronously!
    expect(ctrl.animated).toEqual({})

    // Since we call `update` twice, frames are generated!
    expect(await getAsyncFrames(ctrl)).toMatchSnapshot()
  })
})

function getFrames<T extends object>(ctrl: Controller<T>): T[] {
  const frames: any[] = []
  ctrl.props.onFrame = values => {
    frames.push(values)
  }
  let steps = 0
  while (ctrl.runCount) {
    mockRaf.step()
    if (++steps > 1e5) {
      break // Prevent infinite loops
    }
  }
  return frames
}

async function getAsyncFrames<T extends object>(
  ctrl: Controller<T>
): Promise<T[]> {
  const frames: any[] = []
  ctrl.props.onFrame = values => {
    frames.push(values)
  }
  let steps = 0
  while (ctrl.runCount) {
    mockRaf.step()
    await Promise.resolve()
    if (++steps > 1e5) {
      throw Error('Infinite loop detected')
    }
  }
  return frames
}
