import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { PrimitiveShape } from '@microsoft/mixed-reality-extension-sdk';

/**
 * The main class of this app. All the logic goes here.
 */
export default class Treasure {
	private text: MRE.Actor = null;
	private cube: MRE.Actor = null;
	private treasure: MRE.Actor = null;
	private door: MRE.Actor = null;
	private keypad: MRE.Actor[] = null;
	private assets: MRE.AssetContainer;
	private closed: boolean;
	private correctPin = 1234;
	private enteredPin: number;
	private display: MRE.Actor = null;
	private displayText: MRE.Actor = null;
	private canType = true;
	private openAnim: MRE.Animation;

	constructor(private context: MRE.Context) {
		this.context.onStarted(() => this.started());
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private async started() {
		// set up somewhere to store loaded assets (meshes, textures, animations, gltfs, etc.)
		this.assets = new MRE.AssetContainer(this.context);
		this.keypad = [];
		this.closed = true;
		this.enteredPin = 0;

		//loading of gltf to assets
		const treasure = await this.assets.loadGltf('treasure.gltf', "box");

		const door = await this.assets.loadGltf('door.glb', "box");

		this.treasure = MRE.Actor.CreateFromPrefab(this.context, {
			firstPrefabFrom: treasure,
			actor: {
				name: "treasure",
				transform: {
					app: {
						position: { x: 2, y: 0, z: 0 },
					}
				}
			}
		});

		const butomAsset = this.assets.createBoxMesh("numberButton", 0.05, 0.05, 0.01);

		this.door = MRE.Actor.CreateFromPrefab(this.context, {
			firstPrefabFrom: door,
			actor: {
				name: "door",
				parentId: this.treasure.id,
				transform: {
					local: {
						position: { x: 0, y: 0.5, z: -1 },
						scale: { x: 2, y: 2, z: 2 }
					}
				}

			}
		});

		const openAnimData = this.assets.createAnimationData(
			"Open",
			{
				tracks:
					[
						{
							target: MRE.ActorPath("target").transform.local.position,
							keyframes: this.generateMoveFrames(1),
							easing: MRE.AnimationEaseCurves.Linear
						},
						{
							target: MRE.ActorPath("target").transform.local.rotation,
							keyframes: this.generateSpinFrames(1, MRE.Vector3.Up()),
							easing: MRE.AnimationEaseCurves.Linear
						}
					]
			}
		)

		const closeAnimData = this.assets.createAnimationData(
			"Close",
			{
				tracks:
					[
						{
							target: MRE.ActorPath("target").transform.local.position,
							keyframes: this.generateMoveFrames(-1),
							easing: MRE.AnimationEaseCurves.Linear
						},
						{
							target: MRE.ActorPath("target").transform.local.rotation,
							keyframes: this.generateSpinFrames(-1, MRE.Vector3.Up()),
							easing: MRE.AnimationEaseCurves.Linear
						}
					]
			}
		)

		this.display = MRE.Actor.Create(this.context, {
			actor: {
				name: 'Display',
				parentId: this.door.id,
				transform: {
					local: { position: { x: 0, y: 0.17, z: 0.2 } }
				},
				text: {
					contents: "pin:",
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 30 / 255, g: 215 / 255, b: 42 / 255 },
					height: 0.12,
				}
			}
		})

		//const butomAsset = this.assets.createBoxMesh("numberButton",0.05,0.05,0.01);

		for (let indexY = 0; indexY < 3; indexY++) {
			for (let indexZ = 0; indexZ < 3; indexZ++) {
				const x = -0.07 + 0.07 * indexZ, y = -0.14 + 0.07 * indexY, z = 0.2;
				const keyNumber = ((2 - indexY) * 3 + indexZ + 1);
				let skuska = MRE.Actor.CreatePrimitive(this.assets, {
					definition: { shape: PrimitiveShape.Box, dimensions: { x: 0.05, y: 0.05, z: 0.01 } },
					addCollider: true,
					actor: {
						parentId: this.door.id,
						name: "buttom #" + keyNumber,
						appearance: { meshId: butomAsset.id },
						transform: {
							local: { position: { x: x, y: y, z: z } }
						},
						text: {
							contents: "" + (keyNumber),
							enabled: true,
							anchor: MRE.TextAnchorLocation.MiddleCenter,
							color: { r: 30 / 255, g: 206 / 255, b: 213 / 255 },
							height: 0.1
						}
					}

				});

				const pushAnimData = this.assets.createAnimationData(
					"pushButton",
					{
						tracks: [{
							target: MRE.ActorPath("target").transform.local.position,
							keyframes: this.pushKeyframeData(0.4, x, y, z ),
							easing: MRE.AnimationEaseCurves.Linear
						}]
					});
				const pushAnim = await pushAnimData.bind({ target: skuska });

				const skuskaBehavior = skuska.setBehavior(MRE.ButtonBehavior);

				skuskaBehavior.onClick(_ => {
					pushAnim.play();
					this.enterNum(keyNumber);
				})
			}
		}

		this.openAnim = await openAnimData.bind({ target: this.door });

		const closeAnim = await closeAnimData.bind({ target: this.door });

		const doorButton = this.door.setBehavior(MRE.ButtonBehavior);

		doorButton.onClick(_ => {
			if (!this.closed) {
				this.enteredPin = 0;
				this.closed = true;
				closeAnim.play();
				this.display.text.contents = "pin:";
			}

		})

		// Create a new actor with no mesh, but some text.
		this.text = MRE.Actor.Create(this.context, {
			actor: {
				name: 'Text',
				transform: {
					app: { position: { x: 0, y: 0.5, z: 0 } }
				},
				text: {
					contents: "Hello World!",
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 30 / 255, g: 206 / 255, b: 213 / 255 },
					height: 0.3
				}
			}
		});

		// Here we create an animation for our text actor. First we create animation data, which can be used on any
		// actor. We'll reference that actor with the placeholder "text".
		const spinAnimData = this.assets.createAnimationData(
			// The name is a unique identifier for this data. You can use it to find the data in the asset container,
			// but it's merely descriptive in this sample.
			"Spin",
			{
				// Animation data is defined by a list of animation "tracks": a particular property you want to change,
				// and the values you want to change it to.
				tracks: [{
					// This animation targets the rotation of an actor named "text"
					target: MRE.ActorPath("text").transform.local.rotation,
					// And the rotation will be set to spin over 20 seconds
					keyframes: this.generateSpinKeyframes(20, MRE.Vector3.Up()),
					// And it will move smoothly from one frame to the next
					easing: MRE.AnimationEaseCurves.Linear
				}]
			});
		// Once the animation data is created, we can create a real animation from it.
		spinAnimData.bind(
			// We assign our text actor to the actor placeholder "text"
			{ text: this.text },
			// And set it to play immediately, and bounce back and forth from start to end
			{ isPlaying: true, wrapMode: MRE.AnimationWrapMode.PingPong });

		// Load a glTF model before we use it
		//const cubeData = await this.assets.loadGltf('altspace-cube.glb', "box");

		// spawn a copy of the glTF model
		this.cube = MRE.Actor.CreateFromPrefab(this.context, {
			// using the data we loaded earlier
			firstPrefabFrom: treasure,
			// Also apply the following generic actor properties.
			actor: {
				name: 'Altspace Cube',
				// Parent the glTF model to the text actor, so the transform is relative to the text
				parentId: this.text.id,
				transform: {
					local: {
						position: { x: 0, y: -1, z: 0 },
						scale: { x: 0.4, y: 0.4, z: 0.4 }
					}
				}
			}
		});

		// Create some animations on the cube.
		const flipAnimData = this.assets.createAnimationData(
			// the animation name
			"DoAFlip",
			{
				tracks: [{
					// applies to the rotation of an unknown actor we'll refer to as "target"
					target: MRE.ActorPath("target").transform.local.rotation,
					// do a spin around the X axis over the course of one second
					keyframes: this.generateSpinKeyframes(1.0, MRE.Vector3.Right()),
					// and do it smoothly
					easing: MRE.AnimationEaseCurves.Linear
				},
				{
					target: MRE.ActorPath("target").transform.local.position,
					keyframes: this.generateSpinKeyframes(1.0, MRE.Vector3.Up())
				}
				],

			}
		);
		// apply the animation to our cube
		const flipAnim = await flipAnimData.bind({ target: this.cube });

		// Set up cursor interaction. We add the input behavior ButtonBehavior to the cube.
		// Button behaviors have two pairs of events: hover start/stop, and click start/stop.
		const buttonBehavior = this.cube.setBehavior(MRE.ButtonBehavior);

		// Trigger the grow/shrink animations on hover.
		buttonBehavior.onHover('enter', () => {
			// use the convenience function "AnimateTo" instead of creating the animation data in advance
			MRE.Animation.AnimateTo(this.context, this.cube, {
				destination: { transform: { local: { scale: { x: 0.5, y: 0.5, z: 0.5 } } } },
				duration: 0.3,
				easing: MRE.AnimationEaseCurves.EaseOutSine
			});
		});
		buttonBehavior.onHover('exit', () => {
			MRE.Animation.AnimateTo(this.context, this.cube, {
				destination: { transform: { local: { scale: { x: 0.4, y: 0.4, z: 0.4 } } } },
				duration: 0.3,
				easing: MRE.AnimationEaseCurves.EaseOutSine
			});
		});

		// When clicked, do a 360 sideways.
		buttonBehavior.onClick(_ => {
			flipAnim.play();
		});
	}

	private enterNum(entered: number){
		if (this.canType){
			this.enteredPin = this.enteredPin * 10 + entered;
			this.display.text.contents = this.enteredPin.toString();
			if(this.enteredPin > 999){
				this.canType = false;
				if (!this.closed){
					this.correctPin = this.enteredPin;
					this.display.text.contents = "changed!";
					setTimeout(()=> {
					if (!this.closed){
						this.display.text.contents = "change?";
					}
				},1500);
				} else if (this.enteredPin === this.correctPin){
						this.openAnim.play(); 
						this.closed = false;
						this.display.text.contents = "correct";
						setTimeout(()=> {
								if (!this.closed){
							this.display.text.contents = "change?";
							}
							},1500);
				} else {
					this.enteredPin = 0;
					this.display.text.contents = "wrong";
					this.display.text.color = {r: 255 / 255, g: 0 / 255, b: 0 / 255 };
					setTimeout(() => {
						this.display.text.color = { r: 30 / 255, g: 215 / 255, b: 42 / 255 };
						this.display.text.contents = "pin:";
					}, 1000)
				}
				this.enteredPin = 0;
				setTimeout(() => this.canType = true, 1000);
			}
		} 
	}

	/**
	 * Generate keyframe data for a simple spin animation.
	 * @param duration The length of time in seconds it takes to complete a full revolution.
	 * @param axis The axis of rotation in local space.
	 */
	private generateSpinKeyframes(duration: number, axis: MRE.Vector3): Array<MRE.Keyframe<MRE.Quaternion>> {
		return [{
			time: 0 * duration,
			value: MRE.Quaternion.RotationAxis(axis, 0)
		}, {
			time: 0.25 * duration,
			value: MRE.Quaternion.RotationAxis(axis, Math.PI / 2)
		}, {
			time: 0.5 * duration,
			value: MRE.Quaternion.RotationAxis(axis, Math.PI)
		}, {
			time: 0.75 * duration,
			value: MRE.Quaternion.RotationAxis(axis, 3 * Math.PI / 2)
		}, {
			time: 1 * duration,
			value: MRE.Quaternion.RotationAxis(axis, 2 * Math.PI)
		}];
	}

	private generateSpinFrames(duration: number, axis: MRE.Vector3) {
		if (duration >= 0) {
			return [{
				time: 0 * duration,
				value: MRE.Quaternion.RotationAxis(axis, 0)
			}, {
				time: 0.5 * duration,
				value: MRE.Quaternion.RotationAxis(axis, Math.PI / 4)
			}, {
				time: duration,
				value: MRE.Quaternion.RotationAxis(axis, Math.PI / 2)
			}]
		}
		else {
			return [{
				time: 0 * duration*-1,
				value: MRE.Quaternion.RotationAxis(axis, Math.PI / 2),
			}, {
				time: 0.5 * duration*-1,
				value: MRE.Quaternion.RotationAxis(axis, Math.PI / 4)
			}, {
				time: duration*-1,
				value: MRE.Quaternion.RotationAxis(axis, 0)
			}]
		}
	}

	private generateMoveFrames(duration: number) {
		if (duration>= 0){
			return [
				{
					time: 0,
					value: { x: 0, y: 0.5, z: -1 }
				},
				{
					time: 0.5 * duration,
					value: { x: -0.5, y: 0.5, z: -1.2 }
				},
				{
					time: duration,
					value: { x: -1, y: 0.5, z: -0.9 }
				}
			]
		} else {
			return [
				{
					time: 0,
					value: { x: -1, y: 0.5, z: -0.9 },
				},
				{
					time: 0.5 * duration*-1,
					value: { x: -0.5, y: 0.5, z: -1.2 }
				},
				{
					time: duration*-1,
					value: { x: 0, y: 0.5, z: -1 }
				}
			]
		}
		
	}

	private pushKeyframeData(duration: number, x: number, y: number, z: number ) {
		return [
			{
				time: 0,
				value: { x: x, y: y, z: z }
			}, {
				time: 0.5 * duration,
				value: { x: x, y: y, z: z + 0.01 }
			}, {
				time: duration,
				value: { x: x, y: y, z: z }
			}
		]
	}
}
