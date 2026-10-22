# The ten applications — what each one has to say

Written against the models as they stand in `scene/machines.js`. The point of
this document is the brief a modeller works from: what each rig *is*, where its
bearing sits, and the handful of cues that make a player read it correctly in
the second and a half they look at it.

## The finding

The models are not short of detail. APP_01 already has a car body with a
spoiler, brake lights and a lightning stripe sitting over four spinning rollers.
APP_03 is a jointed arm with two real NSK bearings modelled into its knuckles.
APP_06 has sleepers, rails, coil springs, journal boxes and a Shinkansen nose.

They still fail to read, for four reasons that have nothing to do with how much
geometry is in them:

1. **The camera is far and high.** At play distance a rig is roughly 120–200 px
   tall. Detail below about 8 cm of world size disappears — the brake lights,
   the lidar can, the glowing panels are all under that.
2. **Everything shares one silhouette class.** Nine of the ten are a box-ish
   mass about 2–3 m wide on a 4.6 × 3.6 m bench. From above they are ten grey
   rectangles with different accent colours.
3. **No scale anchor.** Nothing in the frame says whether a rig is the size of a
   dental drill or a wind turbine. APP_07 and APP_05 are both built at bench
   scale, so the micro-spindle and the turbine gearbox read as the same object.
4. **The accent colour is on the chassis, not the function.** Colour currently
   identifies the *panel*, not the thing. A yellow mass and an orange mass don't
   tell you one is a robot and one is a vehicle.

## The five rules

Anything replacing or detailing these should satisfy all five.

1. **Silhouette first.** The rig must be identifiable as a black shape with no
   colour and no detail. Test it: squint, or drop the opacity to zero and look at
   the shadow. If two rigs share a shadow, one of them is wrong.
2. **One tall element.** Give every rig a single feature that breaks the bench's
   horizontal mass — a mast, a blade, an arm, a stack. This is what separates
   them from above, which is the angle the player actually has.
3. **A scale anchor per rig.** Something whose real size everyone knows, built
   to the rig's true scale: a human-height railing, a standard pallet, a hand
   tool, a car door. This is the only way a micro-spindle and a turbine gearbox
   can sit on neighbouring benches and still read correctly.
4. **A motion signature.** The engine already spins any part registered through
   `spin()`. Each rig should move in a way only it could move: a wheel spins,
   a blade sweeps, an arm indexes and pauses, a spindle blurs. Motion is
   readable at distances where shape is not.
5. **Show the bearing.** Each definition already returns a `bearing` coordinate
   marking where its bearing sits. A visible race at that point, large enough to
   see, is the one thread tying all ten to the game's subject.

## Per application

| # | Rig | What it is | Where the bearing is | Must read as | Has | Missing |
|---|---|---|---|---|---|---|
| 01 | EV Powertrain Dyno | A car strapped over powered rollers while its motor is run up | Roller shafts under the near-side wheel | "a car on a test rig" | Car body, spoiler, brake light, four spinning wheels, two roller pits | Reads as a car *parked*, not restrained. Needs tie-down straps and a rolling road pit edge so the rollers are understood as driving the wheels |
| 02 | AGV Drive Hub | The steered drive wheel module under a warehouse robot | Hub centre of the turret | "a robot that carries things" | Chassis, lidar can, beacon, omni wheels, swivel turret, cargo box | The hub itself — the actual product — is buried. Expose the wheel module as a cutaway, and put a pallet beside it for scale |
| 03 | Robot Arm Cell | A six-axis arm doing a pick-and-place inside a fenced cell | Both shoulder and elbow knuckles | "an industrial robot" | Base, shoulder, elbow, forearm, two-finger gripper, two modelled bearings | The best of the ten. Add the safety fence that gives "cell" its meaning, and make the arm index-and-pause rather than rotate continuously |
| 04 | CNC Spindle Bench | A gantry mill cutting a workpiece held on a table | Spindle nose, vertical | "a machine that cuts metal" | Gantry, spindle, workpiece, control panel with indicator lamps | No chips, no coolant, no cut. Needs swarf on the table and a visible cut line in the workpiece — a mill that leaves no mark reads as a prop |
| 05 | Wind Turbine Gearbox | The nacelle: rotor, main shaft and step-up gearbox | Main shaft, horizontal | "a wind turbine" | Tower, nacelle, gearbox block, three sweeping blades | Scale. Built at bench size it is a desk toy. Either cut away the nacelle to show the gearbox as the subject, or add a maintenance hatch and railing at human scale |
| 06 | Bullet Train Bogie | The wheelset and suspension frame under a high-speed train | Axle journal boxes | "a train" | Sleepers, rails, frame, coil springs, journal boxes, nose shell, lit windows | The nose shell competes with the bogie for attention. Drop the shell to a section and let the wheelset dominate — the bogie is the product |
| 07 | Medical Micro-Spindle | A surgical handpiece and its drive, inside a clean enclosure | Spindle, in the handpiece | "a precision medical tool" | Enclosure, screen, articulated arm, handpiece, instrument tray, bearing hologram | The hologram is doing the explaining because the part is too small to see. Keep it, and add a gloved hand or instrument for scale |
| 08 | Air-Taxi Propulsor | An eVTOL rotor and its tilting mount | Rotor hub | "an aircraft rotor" | Pylon, ducted fan with a 5-blade rotor, side pod with its own spinning prop | No tilt mechanism, so it reads as a fixed fan. Nothing gives its size |
| 09 | Jet Engine APU | The small turbine that runs an aircraft's systems on the ground | Turbine shaft | "a jet engine" | Tilted casing, intake ring, glowing exhaust, 8-blade turbine | Sits low and alone on its bench, so nothing breaks the horizontal. Nothing gives its size |
| 10 | HVAC Climate Compressor | A scroll compressor in a rooftop air-conditioning unit | Crankshaft | "an air conditioner" | Finned condenser box, roof fan, compressor tank with bands, pipework, gauge | The grille, which is the single cue that identifies a rooftop unit |

## If these are being remodelled externally

The scene builds every rig from code through `PartBuilder` and `MACHINE_DEFS`.
Swapping in GLBs needs `createMachine(code)` to keep returning a group exposing
the same surface — `group`, `setStatus`, `setDanger`, `update` — and the moving
parts must stay as separately named objects, or rule 4 is lost and the rigs go
inert. The `bearing` and `ringRadius` values already in each definition are the
authored positions for rule 5.

## What has since been built

All ten were detailed in code against the five rules. Shared cues live at the
top of `scene/machines.js` so they exist once rather than ten times: `raceAt`
(rule 5), `railing` and `pallet` (rule 3), `fencePanel`, `grille` and `swarf`.
`PartBuilder.addGroup` was added to `toon.js` to let a sub-assembly be dropped
in under a transform.

| # | Added |
|---|---|
| 01 | Extraction hood on a 2.9 m mast, four tie-down straps to floor rings, bay cones, roller race |
| 02 | Charging dock with contact strips, loaded pallet, the drive hub race exposed |
| 03 | Two safety fence panels and a cell beacon; **motion changed** from three sines to index-and-hold with a reach at each station; yaw race |
| 04 | A cut groove in the workpiece, two piles of swarf, a pallet of bar stock, spindle race |
| 05 | Service platform with two railings, access hatch, tower ladder, main shaft race |
| 06 | Platform edge with the yellow tactile line, journal race |
| 07 | Stool, theatre lamp on a 1.9 m stand, the real race beside the hologram |
| 08 | Trunnion and actuator ram so the pylon reads as tilting, access ladder, hub race |
| 09 | Test stand frame over the engine, wheeled ground cart, shaft race |
| 10 | Louvred grille across the condenser face, service panel with handle, crankshaft race |

Everything added goes through the static builder, so it merges into the same
mesh and costs no extra draw calls. Triangle count was not measured.

Still open: rule 4 for the rigs other than the arm. Wheels, blades, fans and
turbines all turn, but they turn at a constant rate, so the motion identifies
the shape rather than the duty. A dyno sweeping through a speed run, a bogie
rolling in bursts and a compressor cycling on and off would each carry more.
