import type { CSSProperties } from 'react'
import type { WeatherTheme } from '../weather'

type SceneStyle = CSSProperties

const cloudShapes = [
  {
    left: '8%',
    bottom: '18%',
    width: '16rem',
    delay: '-1.5s',
    duration: '13s',
    scale: '1',
    opacity: '0.78',
  },
  {
    left: '30%',
    bottom: '31%',
    width: '20rem',
    delay: '-3.8s',
    duration: '16s',
    scale: '1.05',
    opacity: '0.72',
  },
  {
    left: '58%',
    bottom: '22%',
    width: '15rem',
    delay: '-2.5s',
    duration: '14s',
    scale: '0.92',
    opacity: '0.7',
  },
  {
    left: '70%',
    bottom: '38%',
    width: '18rem',
    delay: '-4.6s',
    duration: '17s',
    scale: '1.08',
    opacity: '0.62',
  },
]

const rainDrops = Array.from({ length: 18 }, (_, index) => ({
  left: `${4 + ((index * 11) % 92)}%`,
  delay: `${(index % 6) * -0.38}s`,
  duration: `${1.65 + (index % 5) * 0.16}s`,
  scale: `${0.95 + (index % 4) * 0.1}`,
}))

const snowFlakes = Array.from({ length: 20 }, (_, index) => ({
  left: `${6 + ((index * 9) % 90)}%`,
  delay: `${(index % 7) * -0.52}s`,
  duration: `${5.4 + (index % 5) * 0.55}s`,
  size: `${0.28 + (index % 3) * 0.16}rem`,
}))

const stars = Array.from({ length: 20 }, (_, index) => ({
  left: `${8 + ((index * 7) % 82)}%`,
  top: `${8 + ((index * 11) % 46)}%`,
  delay: `${(index % 5) * -0.7}s`,
  duration: `${4.3 + (index % 4) * 0.9}s`,
  size: `${0.24 + (index % 3) * 0.12}rem`,
}))

const mistLayers = [
  { top: '26%', width: '90%', delay: '-2.5s', duration: '11s' },
  { top: '42%', width: '105%', delay: '-5.1s', duration: '14s' },
  { top: '58%', width: '94%', delay: '-3.1s', duration: '12s' },
]

function sceneStyle(values: Record<string, string>): SceneStyle {
  return values as SceneStyle
}

type WeatherSceneProps = {
  theme: WeatherTheme
}

export function WeatherScene({ theme }: WeatherSceneProps) {
  return (
    <div className={`scene scene--${theme}`} aria-hidden="true">
      <div className="scene-glow scene-glow--primary" />
      <div className="scene-glow scene-glow--secondary" />

      <div className="sun-system">
        <div className="sun-halo" />
        <div className="sun-ring sun-ring--outer" />
        <div className="sun-ring sun-ring--inner" />
        <div className="sun-core" />
      </div>

      <div className="moon-system">
        <div className="moon-core">
          <div className="moon-cutout" />
        </div>
      </div>

      <div className="star-field">
        {stars.map((star, index) => (
          <span
            key={`star-${index}`}
            className="star"
            style={sceneStyle({
              '--left': star.left,
              '--top': star.top,
              '--delay': star.delay,
              '--duration': star.duration,
              '--size': star.size,
            })}
          />
        ))}
      </div>

      <div className="cloud-layer cloud-layer--back">
        {cloudShapes.map((cloud, index) => (
          <div
            key={`cloud-back-${index}`}
            className="cloud"
            style={sceneStyle({
              '--left': cloud.left,
              '--bottom': cloud.bottom,
              '--width': cloud.width,
              '--delay': cloud.delay,
              '--duration': cloud.duration,
              '--scale': cloud.scale,
              '--opacity': cloud.opacity,
            })}
          />
        ))}
      </div>

      <div className="cloud-layer cloud-layer--front">
        {cloudShapes.map((_cloud, index) => (
          <div
            key={`cloud-front-${index}`}
            className="cloud"
            style={sceneStyle({
              '--left': `${12 + index * 18}%`,
              '--bottom': `${14 + index * 7}%`,
              '--width': `${13 + index * 2}rem`,
              '--delay': `${-2.2 - index * 0.7}s`,
              '--duration': `${12 + index * 2}s`,
              '--scale': `${0.9 + index * 0.06}`,
              '--opacity': `${0.52 + index * 0.06}`,
            })}
          />
        ))}
      </div>

      <div className="rain-field">
        {rainDrops.map((drop, index) => (
          <span
            key={`drop-${index}`}
            className="drop"
            style={sceneStyle({
              '--left': drop.left,
              '--delay': drop.delay,
              '--duration': drop.duration,
              '--scale': drop.scale,
            })}
          />
        ))}
      </div>

      <div className="snow-field">
        {snowFlakes.map((flake, index) => (
          <span
            key={`flake-${index}`}
            className="flake"
            style={sceneStyle({
              '--left': flake.left,
              '--delay': flake.delay,
              '--duration': flake.duration,
              '--size': flake.size,
            })}
          />
        ))}
      </div>

      <div className="fog-field">
        {mistLayers.map((mist, index) => (
          <div
            key={`mist-${index}`}
            className="mist"
            style={sceneStyle({
              '--top': mist.top,
              '--width': mist.width,
              '--delay': mist.delay,
              '--duration': mist.duration,
            })}
          />
        ))}
      </div>
    </div>
  )
}
