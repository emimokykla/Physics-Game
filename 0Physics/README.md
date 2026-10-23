# FysikkSpill-prosjekt

## What it does
This project is a 3D physics game where the player can move around a small scene, pick up objects, throw them, and try to score in a basketball hoop. The game uses physics to make the world feel more realistic, so objects can fall, collide, and be pushed around naturally (Except for some stuff). The goal is to combine graphics and physics in a simple and fun interactive game.

## Technologies I used
I used:
- JavaScript to build the game logic
- Three.js to create the 3D world and graphics
- cannon-es for physics, gravity, and collisions
- HTML and CSS for the website structure and design
- PointerLockControls for first-person movement

## How to start the game
1. Download or clone this project to your computer.
2. Open the project folder in VS Code.
3. Open the root `index.html` with the **Live Server** extension (right-click the file and select **Open with Live Server**, or click **Go Live**).
4. Select a game version and click **Play**. The latest version opens a map selection screen; choose **Classic** or **The room** to begin.

Run the game from a local web server such as Live Server. Opening the HTML file directly, or viewing it in GitHub, does not run the game correctly.

## Features implemented
I have implemented several features in the game:
- First-person movement with WASD
- Jumping and falling
- Collisions with the ground, table, and other objects
- Picking up and dropping items
- Throwing objects with the mouse
- Physics-based objects such as boxes, cylinders, and a basketball
- A score system when an object passes through the hoop
- Confetti effect when scoring
- HUD showing the held item and score
- Bounciness of all the un-anchored objects
- A PC assembly room with movable parts, a removable glass panel, and a toggleable monitor
- Place the finished PC freely or snap it onto the mat; the monitor turns off when it moves away

## Tests I performed
I tested the game several times to check that:
- The player can move around without passing through objects
- Objects can be picked up and thrown correctly
- Objects fall and roll in the right way
- Collisions work against the ground and other obstacles
- The basketball can pass through or hit the hoop in a logical way
- The score system works when an object goes through the hoop
- The PC parts can be installed and removed, and the monitor responds to PC placement and distance

## Problems I found and how I fixed them
I found plenty of issues while developing the game, and fixed them as I went along:

- Problem: I could not pick up objects correctly
  - Solution: I used a raycaster to detect what the player was looking at, then set the object as held and moved it in front of the camera.

- Problem: Objects were moving incorrectly or colliding wrongly with the player
  - Solution: I improved the collision checks so the player and objects would not pass through each other or get stuck.

- Problem: Held objects did not behave properly after being dropped or thrown
  - Solution: I reset their motion and physics correctly when they were released, and gave them velocity when thrown.

- Problem: The score system was not registering properly
  - Solution: I improved the logic to check when an object passes through the hoop and is in the correct position.

- Problem: The player could stand or fall incorrectly on surfaces
  - Solution: I adjusted the movement and support checks so the player can jump, land, and stand on boxes and other support objects more reliably.

- Problem: The objects had really weird physics the whole time
  - Solution: Fixed most of it by changing the weight of them. But the blocks are a fix that i'm still working on.

## Summary
This project has been a great way to learn how to combine 3D graphics and physics in a game. I have learned how to use JavaScript, Three.js, and cannon-es to build an interactive game world with movement, collisions, objects, and scoring. The project has also shown me how important testing and debugging are in development, because small mistakes in physics or controls can affect the whole experience. Overall, this project has helped me understand how game programming works in practice and how to improve a project through problem-solving and testing.

## Kompetansemål og læring
1. Utforske og vurdere eksisterende og nye teknologier og bransjerelevante kodespråk.
   Jeg lærer å bruke JavaScript, Three.js og cannon-es for å lage 3D-grafikk og fysikk i spillet.

2. Velge og bruke relevante rammeverk og moduler til utvikling.
   Jeg bruker Three.js til å lage 3D-verdenen og cannon-es til å få objekter til å falle, kollidere og bevege seg realistisk.

3. Feilsøke kode og rette feil i algoritmer og kode.
   Jeg finner og retter feil, for eksempel når jeg ikke klarer å plukke opp gjenstander, eller når objekter beveger seg feil.

4. Utforske prosesser knyttet til testing og feilsøking i utvikling av løsninger.
   Jeg tester spillet masse for å sjekke at for eksempel spilleren kan bevege seg, plukke opp gjenstander og kaste dem. Jeg bruker resultatene til å forbedre spillet.
