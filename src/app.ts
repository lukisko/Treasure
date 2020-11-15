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
						position: { x: 0, y: 0, z: 0 },
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
