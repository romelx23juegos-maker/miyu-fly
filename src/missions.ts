import * as THREE from 'three';
import { riverX, START } from './world';

export interface Mission {
  id: string;
  name: string;
  blurb: string;                 // descripción corta del menú
  start: THREE.Vector3;
  pts: [number, number, number][];
  ringR: number;
  limit: number;                 // segundos de la misión
  threeStar: number;             // segundos para 3 estrellas
  intro: string;                 // frase de Miyu al despegar
  hints: Record<number, string>; // frase al cruzar el aro n (0 = primero)
  done: string;                  // frase al terminar
}

const river = (z: number, y: number): [number, number, number] => [riverX(z), y, z];

export const MISSIONS: Mission[] = [
  {
    id: 'templo', name: 'Vuelo al templo', blurb: 'Sigue los aros hasta la pagoda roja.',
    start: START.clone(),
    pts: [[150, 92, 150], [160, 82, 70], [85, 76, 5], [-15, 68, 35], [-90, 66, -60], [-135, 56, -135]],
    ringR: 7.5, limit: 55, threeStar: 40,
    intro: '¡Despegamos! ←/→ giran, ↑ morro abajo, ↓ morro arriba. Con Espacio subes. ¡Recoge los dangos!',
    hints: { 0: '¡Genial! Atraviesa los aros para llegar al templo.', 2: '¡Mitad del camino! Si pierdes altura, usa Impulsar (Espacio).', 4: '¡Ya veo el templo! Un aro más.' },
    done: '¡Lo logramos! ¡Qué vista desde el templo!',
  },
  {
    id: 'rio', name: 'Carrera del río', blurb: 'Vuela bajo siguiendo el río. ¡Contrarreloj!',
    start: new THREE.Vector3(riverX(215), 62, 215),
    pts: [river(140, 54), river(80, 46), river(20, 40), river(-40, 36), river(-100, 33), river(-160, 30)],
    ringR: 7.5, limit: 35, threeStar: 28,
    intro: '¡Carrera del río! Mantente sobre el agua y no pierdas tiempo.',
    hints: { 1: '¡Bien! Pasa por debajo de los puentes sin tocarlos.', 3: '¡Vas volando! Ya casi llegamos.' },
    done: '¡Qué carrera! El río nos llevó volando.',
  },
  {
    id: 'castillo', name: 'Entrega al castillo', blurb: 'Lleva el paquete rodeando la torre del castillo.',
    start: new THREE.Vector3(120, 100, -120),
    pts: [[80, 90, -190], [35, 84, -245], [-5, 76, -290], [-65, 68, -330], [-30, 60, -385], [20, 52, -350]],
    ringR: 7.5, limit: 45, threeStar: 34,
    intro: 'Entrega urgente: ¡hay que llevar el paquete al castillo de la colina!',
    hints: { 2: 'Ya estamos sobre la colina. ¡Rodea la torre!', 4: 'Último tramo: ¡vuelve por el patio!' },
    done: '¡Paquete entregado! El señor del castillo estará feliz.',
  },
  {
    id: 'precision', name: 'Desafío de precisión', blurb: 'Aros pequeños sobre los tejados. ¡Pulso firme!',
    start: new THREE.Vector3(170, 100, 170),
    pts: [[150, 88, 150], [110, 80, 90], [130, 76, 30], [80, 72, -10], [100, 68, -60], [50, 64, -90], [70, 60, -140], [20, 56, -170]],
    ringR: 4.5, limit: 70, threeStar: 50,
    intro: 'Desafío de precisión: los aros son pequeños. ¡Con calma!',
    hints: { 1: 'Muy bien. Frena un poco (↓) para apuntar mejor.', 4: '¡Mitad! Sigue así.' },
    done: '¡Puntería perfecta! Eres una gran piloto.',
  },
];
