import * as Tone from 'tone'
import create from 'zustand'
import produce from "immer";
import {useEffect} from "react";

// --- TONE JS --- //

// -- JSON -- //
let defaultAppData = {
	domLoaded: false,
	windowLoaded: false,
	toneRunning: false,
	keysHeld: [],
	keysReleased: []
}

let defaultSynthSettings = {
	OSC_A: {
		name: 'OSC A',
		enabled: 1,
		pos: {
			x: 20,
			y: 140
		},
		controls: {
			octave: 0,
			semitone: 0,
			quantize: 0,
			shape: 0,
			attack: 1,
			decay: 500,
			sustain: 1,
			release: 1000,
		},
		settings: {
			oscillator: {
				volume: -5,
				type: "sawtooth"
			},
			envelope: {
				attack: 1,
				decay: 1,
				sustain: 1,
				release: 1
			},
			filter: {
				Q: 5,
				type: "lowpass",
				rolloff: -12
			},
			filterEnvelope: {
				attack: 0.1,
				decay: 0.2,
				sustain: 1,
				release: 2,
				baseFrequency: 150
			},
			maxPolyphony: 4,
		}
	}
}

// -- Setup & Util -- //
// const polySynth = new Tone.PolySynth(Tone.MonoSynth).toDestination()
const autoFilter = new Tone.AutoFilter("8n").toDestination().start();
const polySynth = new Tone.PolySynth(Tone.MonoSynth, defaultSynthSettings.OSC_A.settings).connect(autoFilter)
const now = Tone.now()
// console.log(Tone.context.state)

// --- zSTATE --- //
const useAppStore = create((set) => ({
	app: defaultAppData,
	setAppData: (targetControl, payload) =>
		set(
			produce((draft) => {
				draft.app[targetControl] = payload
			})
		),
	addKeysHeld: (payload) =>
		set(
			produce((draft) => {
				draft.app.keysHeld.push(payload)
			})
		),
	addKeysReleased: (payload) =>
		set(
			produce((draft) => {
				draft.app.keysReleased.push(payload)
			})
		),
	filterKeysHeld: (payload) =>
		set(
			produce((draft) => {
				draft.app.keysHeld = draft.app.keysHeld.filter((key) => key !== payload)
			})
		),
	clearKeysReleased: () =>
		set(
			produce((draft) => {
				draft.app.keysReleased = []
			})
		),
}))
const useSynthStore = create((set) => ({
	synth: defaultSynthSettings,
	setSynthControls: (targetGroup, targetSubgroup, targetControl, payload) =>
		set(
			produce((draft) => {
				draft.synth[targetGroup][targetSubgroup][targetControl] = payload
			})
		),
	setSynthSettings: (targetGroup, targetSubgroup, payload) =>
		set(
			produce((draft) => {
				draft.synth[targetGroup].settings[targetSubgroup] = payload
			})
		),
	setOscillatorSettings: (targetGroup, targetControl, payload) =>
		set(
			produce((draft) => {
				draft.synth[targetGroup].settings.oscillator[targetControl] = payload
			})
		),
}))

// --- STYLING --- //
const controlContainer = {
	display: 'flex',
	flexDirection: 'row',
	justifyContent: 'center',
}
const controlGroup = {
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'center',
	alignItems: 'center',
	paddingRight: '10px'
}
const oscA_dataContainer_style = {
	backgroundColor: 'black',
	paddingLeft: '10px',
	paddingRight: '10px',
	margin: '2.5px'
}

function Synth() {
	// --- zSTATE --- //
	// -- Getters -- //
	let appData = useAppStore((state) => state.app)
	let synthData = useSynthStore((state) => state.synth)
	// -- Setters -- //
	const setAppData = useAppStore((state) => state.setAppData)
	const updateSynthControls = useSynthStore((state) => state.setSynthControls)
	const updateSynthSettings = useSynthStore((state) => state.setSynthSettings)

	// --- TONE CONTEXT --- //
	const startContext = () => {
		if (Tone.context.state !== "running") {
			document.body.addEventListener("click", function resumeTone() {
				Tone.context.resume().then(() => {
					console.log("Tone is: ", Tone.context.state);
					setAppData("toneRunning", true);
				});
				document.body.removeEventListener("click", resumeTone);
			}, { once: true });
		}
	}

	const OscillatorControls = ({type, group, control, size, min, max, value, modifier, colors}) => {
		// console.log("OscillatorControls:", group, control, size, min, max, value, colors)

		let controlElement;
		let controlOutput;

		let id = group + "_" + control + "_control"
		// console.log("ID:", id)

		let dynamicGroupValue
		let dynamicGroup

		useEffect(() => {
			controlElement = document.getElementById(id);
			controlElement.addEventListener('change', function (e) {
				console.log("ID:", e.target.id, "Val:", e.target.value);
				if(control === "shape") {
					dynamicGroup = {[group]: {"settings": {"oscillator": {[control]: value}}}}
					dynamicGroupValue = dynamicGroup[group].settings.oscillator[control]
					console.log("Dynamic Group:", `${group}-${control}`, dynamicGroup)
					console.log("Dynamic Group Value:", `${group}-${control}`, dynamicGroupValue)

					const newControlsLookup = {
						0: {type: "sine", volume: -12},
						1: {type: "square", volume: -12},
						2: {type: "triangle", volume: -12},
						3: {type: "sawtooth", volume: -12}
					};

					const newControls = newControlsLookup[e.target.value] || newControlsLookup[0];
					console.log("Updating Synth Settings:", group, "settings", newControls)
					updateSynthControls(group, "controls", control, e.target.value)
					updateSynthSettings(group, "oscillator", newControls)
					polySynth.set({
						oscillator: {
							volume: newControls.volume,
							type: newControls.type
						}
					})
				} else {
					dynamicGroup = {[group] : {"controls": {[control]: value}}}
					dynamicGroupValue = dynamicGroup[group].controls[control]
					console.log("Dynamic Group:", `${group}-${control}`, dynamicGroup)
					console.log("Dynamic Group Value:", `${group}-${control}`, dynamicGroupValue)

					controlOutput = e.target.value + modifier;
					console.log("Updating Synth Controls:", group, "controls", control, e.target.value)
					updateSynthControls(group, "controls", control, e.target.value)
				}
			})
		}, [])

		return (
			<div>
				{
					type === "knob" &&
					<div style={controlGroup}>
						<webaudio-knob
							id={id}
							diameter={size}
							min={min}
							max={max}
							value={value}
							colors={colors}
						></webaudio-knob>
						<webaudio-param
							link={id}
							fontSize="14"
						></webaudio-param>
					</div>
				} {
				type === "slider" &&
				<div style={controlGroup}>
					<webaudio-slider
						id={id}
						width={30}
						height={size}
						min={min}
						max={max}
						value={value}
						conv="['sine', 'triangle', 'sawtooth', 'square', 'noise'][x]"
						colors={colors}
						direction="vert"
					></webaudio-slider>
					<webaudio-param
						link={id}
						fontSize="14"
						width="50"
					></webaudio-param>
				</div>
			}
			</div>
		)
	}

	// --- KEYBOARD & NOTE LOGIC --- //

	const oscA_state = useSynthStore((state) => state.synth.OSC_A)

	useEffect(() => {
		document.addEventListener('DOMContentLoaded', () => {
			console.log("DOM Loaded")
			setAppData("domLoaded", true)
		})
		window.addEventListener('load', (event) => {
			console.log("Window Loaded")
			setAppData("windowLoaded", true)
		})
	}, [])

	const Keyboard = () => {
		let keysHeld = useAppStore((state) => state.app.keysHeld)
		let keysReleased = useAppStore((state) => state.app.keysReleased)
		let octave = useSynthStore((state) => state.synth.OSC_A.controls.octave)
		let semitone = useSynthStore((state) => state.synth.OSC_A.controls.semitone)
		console.log("keysHeld array: ", keysHeld)
		console.log("keysReleased array: ", keysReleased)
		console.log("Octave:", octave, "Semitone:", semitone)

		const addKeysHeld = useAppStore((state) => state.addKeysHeld)
		const addKeysReleased = useAppStore((state) => state.addKeysReleased)
		const removeKeysHeld = useAppStore((state) => state.filterKeysHeld)
		const clearKeysReleased = useAppStore((state) => state.clearKeysReleased)

		// -- KEYBOARD LOGIC -- //
		function getNoteFromNumber(number) {
			const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
			// return notes[number % 12];
			return notes[(12 + (number % 12)) % 12];
		}

		// -- TONE SIGNALS -- //
		function noteAttackSignal(key){
			console.log("Attack:", key)
			polySynth.triggerAttack(key, now);
		}
		function noteReleaseSignal(key){
			console.log("Release:", key)
			polySynth.triggerRelease(key, "+0.1");
		}
		function noteAttackReleaseSignal(key){
			console.log("Attack+Release:", key)
			polySynth.triggerAttackRelease(key, "16n");
		}

		useEffect(() => {
			console.log("keysHeld array: ", keysHeld)
			console.log("keysReleased array: ", keysReleased)

			console.log("Initializing Keyboard...")

			let keyboard = document.getElementById("keyboard");

			console.log("SUCCESS!")

			keyboard.addEventListener("mouseover", function () {
				keyboard.cv.focus();
				console.log("mouse over keyboard!");
			});

			let heldKeys = []
			keyboard.addEventListener("change", function (e) {
				console.log("KEY CHANGE!", e.note)
				const inputKey = e.note[1]
				console.log("Input Key: ", inputKey)
				let keyboardOctave = Math.floor(inputKey / 12);
				console.log("Keyboard Octave: ", keyboardOctave)
				console.log("Modifier Octave: ", octave)
				let convertedNote = getNoteFromNumber(inputKey + semitone)
				console.log("Converted Note: ", convertedNote)
				let noteAndOctave = convertedNote + (keyboardOctave + octave)

				if (e.note[0]) {
					console.log("Held note: ", noteAndOctave)
					console.log("Modulo test: ", -1 % 12)

					// addKeysHeld(noteAndOctave)

					heldKeys.push(noteAndOctave)

					noteAttackSignal(noteAndOctave)
					// noteAttackReleaseSignal(noteAndOctave)
				} else {
					console.log("Released note: ", noteAndOctave)

					// addKeysReleased(noteAndOctave)
					// removeKeysHeld(noteAndOctave)

					heldKeys = heldKeys.filter((key) => key !== noteAndOctave)

					noteReleaseSignal([noteAndOctave])

					// Stop all notes if no keys are held (glitch safeguard) //
					if(heldKeys.length === 0) {
						polySynth.releaseAll()
					}
					// noteReleaseSignal(keysReleased)
				}
				// clearKeysReleased()
				// console.log("keysHeld array: ", keysHeld)
				// console.log("keysReleased array: ", keysReleased)
			});
		}, [])

		return (
			<div style={{display: 'flex', justifyContent: 'center', margin: '10px'}}>
				<webaudio-keyboard id="keyboard" keys="49" ></webaudio-keyboard>
			</div>
		)
	}

	function setOscillatorTest () {
		console.log("Setting oscillator test...")
		let newSettings = {
			volume: 0,
			type: "sine",
		}
		updateSynthSettings("OSC_A", "oscillator", newSettings);
	}

	// --- JSX --- //
	return (
		<div>
			<button onClick={setOscillatorTest}>Set Oscillator Test</button>
			<h3>App Data</h3>
			<pre>
				{JSON.stringify(appData, null, 2)}
			</pre>
			<hr/>
			{!appData.toneRunning ?
				<div>
					<button onClick={startContext}>Start Tone!</button>
				</div>
				:
				<div>
					<Keyboard/>
					<h3>Oscillator A</h3>
					<div style={{display: 'flex'}}>
						<div style={oscA_dataContainer_style}>
							<h4>controls</h4>
							<pre>
								{JSON.stringify(oscA_state.controls, null, 2)}
							</pre>
						</div>
						<div style={oscA_dataContainer_style}>
							<h4>oscillator</h4>
							<pre>
								{JSON.stringify(oscA_state.settings.oscillator, null, 2)}
							</pre>
						</div>
						<div style={oscA_dataContainer_style}>
							<h4>envelope</h4>
							<pre>
								{JSON.stringify(oscA_state.settings.envelope, null, 2)}
							</pre>
						</div>
						<div style={oscA_dataContainer_style}>
							<h4>filter</h4>
							<pre>
								{JSON.stringify(oscA_state.settings.filter, null, 2)}
							</pre>
						</div>
						<div style={oscA_dataContainer_style}>
							<h4>filterEnvelope</h4>
							<pre>
								{JSON.stringify(oscA_state.settings.filterEnvelope, null, 2)}
							</pre>
						</div>
					</div>
					{/*<ChangeSynthJSON/>*/}
					<hr/>
					<div style={controlContainer}>
						<OscillatorControls
							type={"knob"}
							group={"OSC_A"}
							control={"octave"}
							size={100}
							min={-3}
							max={3}
							modifier={3}
							value={oscA_state.controls.octave}
							colors={"#FF6188;#2C292D;#D9D9D9"}
						/>
						<OscillatorControls
							type={"knob"}
							group={"OSC_A"}
							control={"semitone"}
							size={100}
							min={-3}
							max={3}
							value={oscA_state.controls.semitone}
							colors={"#A9DC76;#2C292D;#D9D9D9"}
						/>
						<OscillatorControls
							type={"slider"}
							group={"OSC_A"}
							control={"shape"}
							size={100}
							min={0}
							max={4}
							value={oscA_state.controls.shape}
							colors={"#78DCE8;#2C292D;#D9D9D9"}
						/>
					</div>
				</div>
			}
		</div>
	)
}

export default Synth
