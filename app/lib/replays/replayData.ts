/* eslint-disable no-bitwise */
import * as THREE from 'three';

export class ReplayDataPoint {
    offset: number;
    currentRaceTime: number;
    position: THREE.Vector3;
    aimYaw: number;
    aimPitch: number;
    aimDirection: THREE.Vector3;
    velocity: THREE.Vector3;
    speed: number;
    inputSteer: number;
    inputGasPedal: boolean;
    inputIsBraking: boolean;
    engineRpm: number;
    engineCurGear: number;
    wheelsContactCount: number;
    wheelsSkiddingCount: number;
    uiSequence: number = -1;
    loaded: boolean = false;

    constructor(dataView: DataView, offset: number) {
        this.offset = offset;
        this.currentRaceTime = this.readInt32(dataView);
        this.position = this.readVector3(dataView);
        this.aimYaw = this.readFloat(dataView);
        this.aimPitch = this.readFloat(dataView);
        this.aimDirection = this.readVector3(dataView);
        this.velocity = this.readVector3(dataView);
        this.speed = this.readFloat(dataView);
        this.inputSteer = this.readFloat(dataView);
        const gasAndBrake = this.readInt32(dataView);
        // gasAndBrake are encoded in a single byte using the first 2 bits
        //  00 = no input, 01 = gas, 10 = brake, 11 = gas+brake
        this.inputGasPedal = (gasAndBrake & 1) > 0;
        this.inputIsBraking = (gasAndBrake & 2) > 0;
        this.engineRpm = this.readFloat(dataView);
        this.engineCurGear = this.readInt32(dataView);
        this.wheelsContactCount = this.readInt32(dataView);
        this.wheelsSkiddingCount = this.readInt32(dataView);
    }

    readInt32 = (dataView: DataView): number => {
        this.offset += 4;
        return dataView.getInt32(this.offset - 4, true);
    };

    readFloat = (dataView: DataView): number => {
        this.offset += 4;
        return dataView.getFloat32(this.offset - 4, true);
    };

    readVector3 = (dataView: DataView): THREE.Vector3 => {
        const x = this.readFloat(dataView);
        const y = this.readFloat(dataView);
        const z = this.readFloat(dataView);
        return new THREE.Vector3(x, y, z);
    };
}

export interface DataViewResult {
    samples: ReplayDataPoint[];
    minPos: THREE.Vector3;
    maxPos: THREE.Vector3;
    dnfPos: THREE.Vector3;
}

export const readDataView = (dataView: DataView): DataViewResult => {
    const samples = [];
    let lastPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    let dnfPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

    let minPos = new THREE.Vector3(Infinity, Infinity, Infinity);
    let maxPos = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    for (let i = 0; i < dataView.byteLength; i += 76) {
        const s = new ReplayDataPoint(dataView, i);

        if (s.position.x == 0 && s.position.y == 0 && s.position.z == 0) {
            dnfPos = lastPos;
            break;
        }
        samples.push(s);
        minPos = minPos.min(s.position);
        maxPos = maxPos.max(s.position);
        lastPos = s.position;
    }

    return { samples, minPos, maxPos, dnfPos };
};
