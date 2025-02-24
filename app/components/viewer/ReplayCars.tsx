import {
    useFrame, useThree, Camera,
} from '@react-three/fiber';
import * as THREE from 'three';
import React, {
    useRef, useState,
} from 'react';
import { useFBX } from '@react-three/drei';
import { ReplayData } from '../../lib/api/apiRequests';
import { ReplayDataPoint } from '../../lib/replays/replayData';
import vecToQuat from '../../lib/utils/math';
import { CameraMode } from '../../lib/contexts/SettingsContext';
import InputOverlay from './InputOverlay';
import {
    getSampleNearTime, interpolateSamples,
} from '../../lib/utils/replay';
import GlobalTimeLineInfos from '../../lib/singletons/timeLineInfos';

const BACK_WHEEL_Y = 35.232017517089844;
const FRONT_WHEEL_Y = 35.24349594116211;

interface ReplayCarProps {
    replay: ReplayData;
    camera: Camera;
    orbitControlsRef: any;
    showInputOverlay: boolean;
    fbx: THREE.Object3D;
    replayCarOpacity: number;
    cameraMode: CameraMode;
}

const ReplayCar = ({
    replay, camera, orbitControlsRef, showInputOverlay, fbx, replayCarOpacity, cameraMode,
}: ReplayCarProps) => {
    const mesh = useRef<THREE.Mesh>();
    const stadiumCarMesh = useRef<THREE.Mesh>();
    const camPosRef = useRef<THREE.Mesh>();

    const currentSampleRef = useRef<ReplayDataPoint>(replay.samples[0]);
    const prevSampleRef = useRef<ReplayDataPoint>(replay.samples[0]);

    const timeLineGlobal = GlobalTimeLineInfos.getInstance();

    let curSample = replay.samples[0];
    const smoothSample: ReplayDataPoint = { ...replay.samples[0] };

    // Get own material from loaded car model
    const carMesh: THREE.Mesh = fbx.children[0] as THREE.Mesh;
    const material: THREE.MeshPhongMaterial = carMesh.material as THREE.MeshPhongMaterial;
    const matClone = material.clone();
    matClone.opacity = replayCarOpacity;
    matClone.color = new THREE.Color(
        replay.color.r,
        replay.color.g,
        replay.color.b,
    );

    fbx.children.forEach((child: any) => {
        child.material = matClone;
    });
    fbx.traverse((children: THREE.Object3D) => {
        if (children instanceof THREE.Mesh) {
            children.castShadow = true;
        }
    });

    useFrame((state, delta) => {
        timeLineGlobal.tickTime = delta * 1000;
        if (mesh.current
            && stadiumCarMesh.current
            && camPosRef.current) {
            const followed = timeLineGlobal.followedReplay != null && timeLineGlobal.followedReplay._id === replay._id;
            const hovered = timeLineGlobal.hoveredReplay != null && timeLineGlobal.hoveredReplay._id === replay._id;

            // Get closest sample to TimeLine.currentRaceTime
            curSample = getSampleNearTime(replay, timeLineGlobal.currentRaceTime);

            currentSampleRef.current = curSample;
            prevSampleRef.current = replay.samples[replay.samples.indexOf(curSample) - 1];

            if (timeLineGlobal.currentRaceTime < replay.endRaceTime) {
                interpolateSamples(prevSampleRef.current, curSample, smoothSample, timeLineGlobal.currentRaceTime);
            } else {
                interpolateSamples(prevSampleRef.current, curSample, smoothSample, curSample.currentRaceTime);
            }

            // Get car rotation
            const carRotation: THREE.Quaternion = vecToQuat(
                smoothSample.dir,
                smoothSample.up,
            );

            // Move & rotate 3D car from current sample rot & pos
            mesh.current.position.set(smoothSample.position.x, smoothSample.position.y, smoothSample.position.z);

            stadiumCarMesh.current.rotation.setFromQuaternion(carRotation);

            // Set front wheels rotation
            stadiumCarMesh.current.children[2].rotation.y = smoothSample.wheelAngle; // FL
            stadiumCarMesh.current.children[4].rotation.y = smoothSample.wheelAngle; // FR

            // Set wheel suspensions
            stadiumCarMesh.current.children[1].position.setY(BACK_WHEEL_Y - (smoothSample.rRDamperLen * 100)); // RR
            stadiumCarMesh.current.children[2].position.setY(FRONT_WHEEL_Y - (smoothSample.fLDamperLen * 100)); // FL
            stadiumCarMesh.current.children[3].position.setY(BACK_WHEEL_Y - (smoothSample.rLDamperLen * 100)); // RL
            stadiumCarMesh.current.children[4].position.setY(FRONT_WHEEL_Y - (smoothSample.fRDamperLen * 100)); // FR

            // Camera target replay if selected
            if (followed) {
                if (orbitControlsRef && orbitControlsRef.current) {
                    orbitControlsRef.current.target.lerp(smoothSample.position, 0.2);

                    if (cameraMode === CameraMode.Follow) {
                        // move camPosMesh to Follow position
                        camPosRef.current.rotation.setFromQuaternion(carRotation);
                        // move toward where the car is heading
                        camPosRef.current.position.set(
                            -smoothSample.velocity.x / 5,
                            -smoothSample.velocity.y / 5,
                            -smoothSample.velocity.z / 5,
                        );
                        camPosRef.current.translateZ(-7 - (smoothSample.speed / 30));
                        camPosRef.current.translateY(2 + (smoothSample.speed / 200));
                        // move camera to camPosMesh world position
                        const camWorldPos: THREE.Vector3 = new THREE.Vector3();
                        camPosRef.current.getWorldPosition(camWorldPos);
                        camera.position.lerp(camWorldPos, 0.3);
                    }
                }
            }
            // Scale car up if hovered in LoadedReplays
            if (hovered) {
                stadiumCarMesh.current.scale.lerp(new THREE.Vector3(0.02, 0.02, 0.02), 0.2);
            } else {
                stadiumCarMesh.current.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), 0.2);
            }
        }
    });

    const [opts, setOpts] = useState({
        fontSize: 6,
        color: '#99ccff',
        maxWidth: 200,
        lineHeight: 'normal',
        letterSpacing: 0,
        textAlign: 'left',
        materialType: 'MeshPhongMaterial',
        anchorX: 'center',
        anchorY: 'middle',
        outlineWidth: 0.5,
        outlineColor: 'black',
    });
    const [rotation, setRotation] = useState([0, 0, 0, 0]);

    return (
        <>
            <mesh
                ref={mesh}
                scale={1}
            >

                <primitive
                    object={fbx}
                    dispose={null}
                    ref={stadiumCarMesh}
                    scale={0.01}
                    receiveShadow
                    castShadow
                />

                {showInputOverlay
                    && <InputOverlay sampleRef={currentSampleRef} camera={camera} />}
                <mesh
                    ref={camPosRef}
                >
                    <sphereBufferGeometry args={[0.1, 30, 30]} attach="geometry" />
                    <meshBasicMaterial color={replay.color} transparent opacity={0} attach="material" />
                </mesh>

            </mesh>
        </>
    );
};

interface ReplayCarsProps {
    replaysData: ReplayData[];
    orbitControlsRef: any;
    showInputOverlay: boolean;
    replayCarOpacity: number;
    cameraMode: CameraMode;
}

const ReplayCars = ({
    replaysData,
    orbitControlsRef,
    showInputOverlay,
    replayCarOpacity,
    cameraMode,
}: ReplayCarsProps): JSX.Element => {
    const camera = useThree((state) => state.camera);
    const fbx = useFBX('/StadiumCarWheelsSeparated.fbx');

    return (
        <>
            {replaysData.map((replay) => (
                <ReplayCar
                    key={`replay-${replay._id}-car`}
                    replay={replay}
                    camera={camera}
                    orbitControlsRef={orbitControlsRef}
                    showInputOverlay={showInputOverlay}
                    fbx={fbx.clone()}
                    replayCarOpacity={replayCarOpacity}
                    cameraMode={cameraMode}
                />
            ))}
        </>
    );
};

export default ReplayCars;
