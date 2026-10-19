# OWAIS.SYS — The Dark Side of Code

### V12 · Real-Time 3D Developer Portfolio

> **A cosmic mind. A developer's mindset. The power of the Dark Side.**

Welcome to **OWAIS.SYS**, my personal developer portfolio reimagined as a cinematic, interactive 3D experience. Built with **Vite and Three.js**, it combines software development, storytelling, procedural 3D graphics, and immersive audio in a Star Wars-inspired dark sci-fi environment.

This isn't just a portfolio filled with sections and project cards. It's an interactive journey through my mind, projects, technical skills, philosophy, humor, and darker thoughts, accompanied by a real-time 3D cinematic story.

**Live Demo:** [md-owais-portfolio.netlify.app](https://md-owais-portfolio.netlify.app/)

---

## What Makes It Different?

- **Real-Time 3D:** A live Three.js environment instead of static battle images and CSS character silhouettes.
- **Story-Driven Scrolling:** Scrolling through the portfolio advances a cinematic story.
- **Procedural Characters:** A custom-built 3D Vader helmet and procedural costume elements.
- **Skeletal Animation:** Animated characters driven by an AnimationMixer, with movement blended according to velocity.
- **Lightsaber Combat:** Hand-attached glowing sabers, code-authored combat poses, clashes, and defeat animations.
- **Cinematic Effects:** Force lightning, shockwaves, sparks, fog, bloom, shadows, and camera shake.
- **Immersive Audio:** Synthesized lightsaber sounds, combat effects, and an original dark orchestral-style score.
- **Interactive Content:** Projects, skills, mini-games, philosophy, humor, Dark Thoughts, and contact sections.
- **Performance Tiers:** Configurable quality levels, adaptive resolution, and mobile-conscious rendering.
- **Accessibility:** Reduced-motion support, a mute control, and a fallback experience for devices without WebGL support.

## Portfolio Sections

The experience preserves the original portfolio content while presenting it through a unified cinematic interface.

| Section | Purpose |
|---|---|
| Home / Hero | Introduction and cinematic entry into OWAIS.SYS |
| Mind | Personal mindset, curiosity, and developer identity |
| Projects | Selected software and development projects |
| Skills | Programming languages, frameworks, and technical tools |
| Mini-game | An interactive break from the main experience |
| Philosophy | Thoughts on life, technology, and personal growth |
| Humor | A lighter side of the developer's personality |
| Dark Thoughts | A darker, introspective section |
| Contact | Connect and collaborate |

The experience also includes clearance gates, joke and thought generators, and interactive elements throughout the portfolio.

## Featured Projects

The portfolio showcases projects across software development, AI, automation, and technical content.

- **Vaderis** — A project featured within the portfolio's cinematic identity.
- **JARVIS** — A Python-based voice assistant project.
- **Groundwater Predictor** — A project focused on groundwater prediction.
- **CareConnect** — A healthcare-oriented project.
- **TechWithOwais** — My technical blog and learning-in-public platform.

Explore the live portfolio for the full project showcase.

## Technology Stack

| Technology | Role |
|---|---|
| Vite | Development server and production build tooling |
| Three.js | Real-time 3D rendering and scene management |
| JavaScript | Application logic and interactions |
| HTML5 | Portfolio structure |
| CSS3 | Layout, responsive styling, and interface effects |
| Web Audio API | Procedural sound effects and synthesized music |
| GLB / glTF | 3D character model loading |
| AnimationMixer | Skeletal animation playback and blending |
| Netlify | Portfolio deployment and hosting |
| Git and GitHub | Version control and project management |

## The Real-Time 3D Experience

The cinematic environment is built around a real-time 3D scene rather than a pre-rendered battle animation.

### Characters and Animation

The project uses a rigged GLB character model with skeletal animation. An `AnimationMixer` blends idle, walking, and running animations according to character velocity.

Additional combat movement is authored in code, including:

- Two-bone inverse kinematics for saber-arm positioning.
- Spine leaning and head-look behavior.
- Kneeling, toppling, and defeat poses.
- World-space blade positioning for saber clashes.

### Lightsabers

The lightsabers combine a hilt, layered emissive geometry, and point lighting. Each blade is attached to the character's right-hand bone rather than being positioned as a floating prop.

### Procedural Vader Helmet

The custom helmet is generated through `src/helmet.js`, using procedural geometry and physically based rendering materials to create a glossy, metallic appearance.

### Environment and Visual Effects

The scene includes:

- A reactor chamber and an open reactor shaft.
- Columns, atmospheric fog, and volumetric-style light shafts.
- Dust particles, shadows, and bloom.
- Deterministic spark bursts.
- Force-lightning ribbons and Force-push shockwaves.
- Flash lighting and cinematic camera shake.

### Audio

The Web Audio API generates the core soundscape, including lightsaber ignition, humming, swings, clashes, Force pushes, lightning, defeats, and the reactor-shaft fall sequence.

Optional audio files can override selected synthesized effects.

## Story-Driven Scrolling

The cinematic sequence is controlled by story time through `src/story.js`.

Rather than running an unrelated animation for every section, the experience maps scroll position to a shared story timeline. This makes the sequence easier to scrub, revisit, resize, and navigate.

### Story Progression

| Portfolio Sections | Cinematic Event |
|---|---|
| Home | Vader stands idle |
| Mind | Vader senses a presence |
| Projects / Skills | Obi-Wan duel |
| Mini-game / Philosophy | Plagueis duel and Force push |
| Humor / Dark Thoughts | Palpatine confrontation and lightning |
| Contact | Lift, throw, reactor-shaft fall, and epilogue |

Audio is handled separately from the story timeline and triggers on forward movement, preventing repeated sound playback during backward scrubbing.

## Getting Started

### Prerequisites

- Node.js and npm.
- A modern browser with WebGL support.
- Git, if cloning the repository.

### Installation

Clone your repository and enter the project directory:

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local address shown by Vite, typically:

[http://localhost:5173](http://localhost:5173)

### Production Build

Generate the production build:

```bash
npm run build
```

The generated files are placed in `dist/`.

Preview the production build locally:

```bash
npm run preview
```

The build is configured for relative paths, allowing deployment under different hosting paths when the project configuration and assets support that deployment.

## Development and Testing Flags

The project supports query-string flags for testing specific parts of the experience.

| Flag | Purpose |
|---|---|
| `?skip=1` | Skip the intro |
| `?t=23.6` | Freeze the story at 23.6 seconds |
| `?ip=1` | Preview the ignited intro |
| `?tier=low` | Force low rendering quality |
| `?tier=mid` | Force medium rendering quality |
| `?tier=high` | Force high rendering quality |

Example:

```text
http://localhost:5173/?skip=1&tier=low
```

These flags are useful for debugging animation timing, testing performance, and reviewing individual parts of the cinematic sequence.

## Key Source Files

```text
src/
├── actors.js       # Character setup and procedural costumes
├── helmet.js       # Procedural Vader helmet
└── story.js        # Story timeline and scroll-driven events

public/
└── assets/
    ├── models/
    │   └── Soldier.glb
    └── audio/
        ├── lightsaber-ignite.mp3
        └── imperial-march.mp3
```

This is a high-level view of the key files described by the project. The complete repository may contain additional modules, configuration files, assets, and components.

## Current Limitations and Asset Notes

The cinematic experience uses real-time 3D rendering, but some character assets and animations remain replaceable stand-ins.

1. **Character models:** Licensed Star Wars character models are not bundled. The current implementation uses a shared stand-in rig with procedural costume elements. Replace these with properly licensed, compatible rigged models to improve character authenticity.

2. **Mixamo model:** The supplied `Soldier.glb` originates from the Three.js examples and uses a Mixamo-style rig. Review the applicable asset terms before redistribution or production use.

3. **Combat animation:** Combat poses and movements are authored in code. Dedicated, appropriately licensed combat clips could make slashes, parries, and defeats more realistic.

4. **Audio:** Film audio is not included. Synthesized sound effects are used by default, with optional local audio overrides for compatible files.

5. **Additional encounters:** The current cinematic sequence focuses on three principal encounters. Additional opponents and scenes would require further character, animation, and story work.

The goal is to make the experience immersive while keeping its implementation and asset limitations transparent.

## Performance and Accessibility

The project includes several measures to support different devices:

- Low, medium, and high rendering-quality tiers.
- Adjustable shadow, bloom, and particle quality.
- Pixel-ratio limits and adaptive resolution under slow frame rates.
- `prefers-reduced-motion` support to reduce camera shake, smoothing, and dust effects.
- A no-WebGL fallback that preserves access to the portfolio content.
- A more readable mobile layout with an additional visual veil.
- A mute toggle available after the introduction.

Actual performance depends on the device, browser, GPU, and selected quality tier.

## Future Improvements

- Integrate additional licensed character models.
- Add dedicated combat animation clips.
- Improve cinematic choreography and character interactions.
- Expand the collection of 3D environments and encounters.
- Refine mobile rendering and accessibility.
- Optimize asset loading and scene performance.
- Continue expanding the software and AI projects showcased in the portfolio.

## About Me

I'm **Mohd. Owais**, a Computer Science and Engineering student interested in software engineering, problem-solving, and artificial intelligence.

My technical interests include:

- Data Structures and Algorithms
- Full-Stack Development
- Artificial Intelligence and Machine Learning
- Deep Learning and Large Language Models
- Python automation and software projects

I believe in learning by building, documenting the journey, and consistently pushing beyond what I already know.

## Connect With Me

- **Portfolio:** [md-owais-portfolio.netlify.app](https://md-owais-portfolio.netlify.app/)
- **GitHub:** [md-owais9956](https://github.com/md-owais9956)
- **Tech Blog:** [techwithowais.co.in](https://techwithowais.co.in/)

## License

This project is licensed under the **MIT License**.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, subject to the terms and conditions of the MIT License.

See the [LICENSE](LICENSE) file for the complete license text.

**Copyright (c) 2026 Mohd. Owais**

Third-party libraries, models, fonts, and media remain subject to their respective licenses and terms of use. The MIT License for this project does not override the separate licensing requirements of third-party assets.

---

<p align="center">
  <b>OWAIS.SYS — The Dark Side of Code</b>
  <br />
  Built with JavaScript, Three.js, and a developer's imagination.
  <br /><br />
  <i>Code is the weapon. Creativity is the Force.</i>
</p>
