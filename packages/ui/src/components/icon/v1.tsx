import React from 'react';
import type { IconName, IconProps } from '../../props.ts';
import { library } from '../../index.ts';

/**
 * Stock Ionicons outline SVG paths (MIT License, Copyright (c) 2015-present Ionic http://ionic.io/).
 * Source SVGs located in node_modules/ionicons/dist/svg/
 *
 * Mappings:
 * - back: arrow-back-outline.svg
 * - plus: add-outline.svg
 * - more: ellipsis-horizontal-outline.svg
 * - edit: pencil-outline.svg
 * - check: checkmark-outline.svg
 * - close: close-outline.svg
 * - clock: time-outline.svg
 * - flour: leaf-outline.svg
 * - fat: cube-outline.svg
 * - sugar: nutrition-outline.svg
 * - water: water-outline.svg
 * - scale: scale-outline.svg
 * - temperature: thermometer-outline.svg
 * - oven: flame-outline.svg
 * - note: document-text-outline.svg
 * - photo: camera-outline.svg
 * - book: book-outline.svg
 * - settings: settings-outline.svg
 * - arrowUp: arrow-up-outline.svg
 * - arrowDown: arrow-down-outline.svg
 * - copy: copy-outline.svg
 * - undo: arrow-undo-outline.svg
 * - redo: arrow-redo-outline.svg
 * - info: information-circle-outline.svg
 * - chevronDown: chevron-down-outline.svg
 * - chevronUp: chevron-up-outline.svg
 * - menu: menu-outline.svg
 * - play: play-outline.svg
 * - lock: lock-closed-outline.svg
 * - unlock: lock-open-outline.svg
 * - trash: trash-outline.svg
 * - warning: warning-outline.svg
 * - library: library-outline.svg
 * - ingredient: egg-outline.svg
 * - calendar: calendar-outline.svg
 */
const ICON_ELEMENTS: Record<IconName, React.ReactNode> = {
  // Source: arrow-back-outline.svg
  back: (
    <>
      <path
        d="M244 400 100 256l144-144M120 256h292"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="48px"
      />
    </>
  ),
  // Source: add-outline.svg
  plus: (
    <>
      <path
        d="M256 112v288M400 256H112"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: ellipsis-horizontal-outline.svg
  more: (
    <>
      <circle
        cx="256"
        cy="256"
        r="32"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <circle
        cx="416"
        cy="256"
        r="32"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <circle
        cx="96"
        cy="256"
        r="32"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: pencil-outline.svg
  edit: (
    <>
      <path
        d="M364.13 125.25 87 403l-23 45 44.99-23 277.76-277.13zM420.69 68.69l-22.62 22.62 22.62 22.63 22.62-22.63a16 16 0 0 0 0-22.62h0a16 16 0 0 0-22.62 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: checkmark-outline.svg
  check: (
    <>
      <path
        d="M416 128 192 384l-96-96"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: close-outline.svg
  close: (
    <>
      <path
        d="M368 368 144 144M368 144 144 368"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: time-outline.svg
  clock: (
    <>
      <path
        d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64Z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <path
        d="M256 128v144h96"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: leaf-outline.svg
  flour: (
    <>
      <path
        d="M321.89 171.42C233 114 141 155.22 56 65.22c-19.8-21-8.3 235.5 98.1 332.7 77.79 71 197.9 63.08 238.4-5.92s18.28-163.17-70.61-220.58"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="M173 253c86 81 175 129 292 147"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: cube-outline.svg
  fat: (
    <>
      <path
        d="M448 341.37V170.61A32 32 0 0 0 432.11 143l-152-88.46a47.94 47.94 0 0 0-48.24 0L79.89 143A32 32 0 0 0 64 170.61v170.76A32 32 0 0 0 79.89 369l152 88.46a48 48 0 0 0 48.24 0l152-88.46A32 32 0 0 0 448 341.37"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="m69 153.99 187 110 187-110M256 463.99v-200"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: nutrition-outline.svg
  sugar: (
    <>
      <path
        d="M352 128c-32.26-2.89-64 16-96 16s-63.75-19-96-16c-64 6-96 64-96 160 0 80 64 192 111.2 192s51.94-24 80.8-24 33.59 24 80.8 24S448 368 448 288c0-96-29-154-96-160Z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <path d="M323.92 83.14c-21 21-45.66 27-58.82 28.79a8 8 0 0 1-9.1-8.73 97.6 97.6 0 0 1 28.61-59.33c22-22 46-26.9 58.72-27.85a8 8 0 0 1 8.67 8.92 98 98 0 0 1-28.08 58.2" />
      <ellipse cx="216" cy="304" rx="24" ry="48" />
      <ellipse cx="296" cy="304" rx="24" ry="48" />
    </>
  ),
  // Source: water-outline.svg
  water: (
    <>
      <path
        d="M400 320c0 88.37-55.63 144-144 144s-144-55.63-144-144c0-94.83 103.23-222.85 134.89-259.88a12 12 0 0 1 18.23 0C296.77 97.15 400 225.17 400 320Z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <path
        d="M344 328a72 72 0 0 1-72 72"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: scale-outline.svg
  scale: (
    <>
      <rect
        width="416"
        height="416"
        x="48"
        y="48"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32"
        rx="96"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32"
        d="M388.94 151.56c-24.46-22.28-68.72-51.4-132.94-51.4s-108.48 29.12-132.94 51.4a34.66 34.66 0 0 0-3.06 48.08l33.32 39.21a26.07 26.07 0 0 0 33.6 5.21c15.92-9.83 40.91-21.64 69.1-21.64s53.18 11.81 69.1 21.64a26.07 26.07 0 0 0 33.6-5.21L392 199.64a34.66 34.66 0 0 0-3.06-48.08Z"
      />
    </>
  ),
  // Source: thermometer-outline.svg
  temperature: (
    <>
      <path
        d="M307.72 302.27a8 8 0 0 1-3.72-6.75V80a48 48 0 0 0-48-48h0a48 48 0 0 0-48 48v215.52a8 8 0 0 1-3.71 6.74 97.51 97.51 0 0 0-44.19 86.07A96 96 0 0 0 352 384a97.49 97.49 0 0 0-44.28-81.73ZM256 112v272"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <circle cx="256" cy="384" r="48" />
    </>
  ),
  // Source: flame-outline.svg
  oven: (
    <>
      <path
        d="M112 320c0-93 124-165 96-272 66 0 192 96 192 272a144 144 0 0 1-288 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="M320 368c0 57.71-32 80-64 80s-64-22.29-64-80 40-86 32-128c42 0 96 70.29 96 128"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: document-text-outline.svg
  note: (
    <>
      <path
        d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="M256 56v120a32 32 0 0 0 32 32h120M176 288h160M176 368h160"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: camera-outline.svg
  photo: (
    <>
      <path
        d="m350.54 148.68-26.62-42.06C318.31 100.08 310.62 96 302 96h-92c-8.62 0-16.31 4.08-21.92 10.62l-26.62 42.06C155.85 155.23 148.62 160 140 160H80a32 32 0 0 0-32 32v192a32 32 0 0 0 32 32h352a32 32 0 0 0 32-32V192a32 32 0 0 0-32-32h-59c-8.65 0-16.85-4.77-22.46-11.32"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <circle
        cx="256"
        cy="272"
        r="80"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <path
        d="M124 158v-22h-24v22"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: book-outline.svg
  book: (
    <>
      <path
        d="M256 160c16-63.16 76.43-95.41 208-96a15.94 15.94 0 0 1 16 16v288a16 16 0 0 1-16 16c-128 0-177.45 25.81-208 64-30.37-38-80-64-208-64-9.88 0-16-8.05-16-17.93V80a15.94 15.94 0 0 1 16-16c131.57.59 192 32.84 208 96M256 160v288"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: settings-outline.svg
  settings: (
    <>
      <path
        d="M262.29 192.31a64 64 0 1 0 57.4 57.4 64.13 64.13 0 0 0-57.4-57.4M416.39 256a154 154 0 0 1-1.53 20.79l45.21 35.46a10.81 10.81 0 0 1 2.45 13.75l-42.77 74a10.81 10.81 0 0 1-13.14 4.59l-44.9-18.08a16.11 16.11 0 0 0-15.17 1.75A164.5 164.5 0 0 1 325 400.8a15.94 15.94 0 0 0-8.82 12.14l-6.73 47.89a11.08 11.08 0 0 1-10.68 9.17h-85.54a11.11 11.11 0 0 1-10.69-8.87l-6.72-47.82a16.07 16.07 0 0 0-9-12.22 155 155 0 0 1-21.46-12.57 16 16 0 0 0-15.11-1.71l-44.89 18.07a10.81 10.81 0 0 1-13.14-4.58l-42.77-74a10.8 10.8 0 0 1 2.45-13.75l38.21-30a16.05 16.05 0 0 0 6-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 0 0-6.07-13.94l-38.19-30A10.81 10.81 0 0 1 49.48 186l42.77-74a10.81 10.81 0 0 1 13.14-4.59l44.9 18.08a16.11 16.11 0 0 0 15.17-1.75A164.5 164.5 0 0 1 187 111.2a15.94 15.94 0 0 0 8.82-12.14l6.73-47.89A11.08 11.08 0 0 1 213.23 42h85.54a11.11 11.11 0 0 1 10.69 8.87l6.72 47.82a16.07 16.07 0 0 0 9 12.22 155 155 0 0 1 21.46 12.57 16 16 0 0 0 15.11 1.71l44.89-18.07a10.81 10.81 0 0 1 13.14 4.58l42.77 74a10.8 10.8 0 0 1-2.45 13.75l-38.21 30a16.05 16.05 0 0 0-6.05 14.08c.33 4.14.55 8.3.55 12.47"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: arrow-up-outline.svg
  arrowUp: (
    <>
      <path
        d="m112 244 144-144 144 144M256 120v292"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="48px"
      />
    </>
  ),
  // Source: arrow-down-outline.svg
  arrowDown: (
    <>
      <path
        d="m112 268 144 144 144-144M256 392V100"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="48px"
      />
    </>
  ),
  // Source: copy-outline.svg
  copy: (
    <>
      <rect
        width="336"
        height="336"
        x="128"
        y="128"
        rx="57"
        ry="57"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="m383.5 128 .5-24a56.16 56.16 0 0 0-56-56H112a64.19 64.19 0 0 0-64 64v216a56.16 56.16 0 0 0 56 56h24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: arrow-undo-outline.svg
  undo: (
    <>
      <path
        d="M240 424v-96c116.4 0 159.39 33.76 208 96 0-119.23-39.57-240-208-240V88L64 256Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: arrow-redo-outline.svg
  redo: (
    <>
      <path
        d="M448 256 272 88v96C103.57 184 64 304.77 64 424c48.61-62.24 91.6-96 208-96v96Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: information-circle-outline.svg
  info: (
    <>
      <path
        d="M248 64C146.39 64 64 146.39 64 248s82.39 184 184 184 184-82.39 184-184S349.61 64 248 64Z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <path
        d="M220 220h32v116"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="M208 340h88"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <path fill="currentColor" d="M248 130a26 26 0 1 0 26 26 26 26 0 0 0-26-26" />
    </>
  ),
  // Source: chevron-down-outline.svg
  chevronDown: (
    <>
      <path
        d="m112 184 144 144 144-144"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="48px"
      />
    </>
  ),
  // Source: chevron-up-outline.svg
  chevronUp: (
    <>
      <path
        d="m112 328 144-144 144 144"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="48px"
      />
    </>
  ),
  // Source: menu-outline.svg
  menu: (
    <>
      <path
        d="M80 160h352M80 256h352M80 352h352"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: play-outline.svg
  play: (
    <>
      <path
        d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16Z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: lock-closed-outline.svg
  lock: (
    <>
      <path
        d="M336 208v-95a80 80 0 0 0-160 0v95"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <rect
        width="320"
        height="272"
        x="96"
        y="208"
        rx="48"
        ry="48"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: lock-open-outline.svg
  unlock: (
    <>
      <path
        d="M336 112a80 80 0 0 0-160 0v96"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <rect
        width="320"
        height="272"
        x="96"
        y="208"
        rx="48"
        ry="48"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: trash-outline.svg
  trash: (
    <>
      <path
        d="m112 112 20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="M80 112h352"
        stroke="currentColor"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
      <path
        d="M192 112V72h0a23.93 23.93 0 0 1 24-24h80a23.93 23.93 0 0 1 24 24h0v40M256 176v224M184 176l8 224M328 176l-8 224"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: warning-outline.svg
  warning: (
    <>
      <path
        d="M85.57 446.25h340.86a32 32 0 0 0 28.17-47.17L284.18 82.58c-12.09-22.44-44.27-22.44-56.36 0L57.4 399.08a32 32 0 0 0 28.17 47.17"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="m250.26 195.39 5.74 122 5.73-121.95a5.74 5.74 0 0 0-5.79-6h0a5.74 5.74 0 0 0-5.68 5.95"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path fill="currentColor" d="M256 397.25a20 20 0 1 1 20-20 20 20 0 0 1-20 20" />
    </>
  ),
  // Source: library-outline.svg
  library: (
    <>
      <rect
        width="64"
        height="368"
        x="32"
        y="96"
        rx="16"
        ry="16"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="M112 224h128M112 400h128"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <rect
        width="128"
        height="304"
        x="112"
        y="160"
        rx="16"
        ry="16"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <rect
        width="96"
        height="416"
        x="256"
        y="48"
        rx="16"
        ry="16"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
      <path
        d="m422.46 96.11-40.4 4.25c-11.12 1.17-19.18 11.57-17.93 23.1l34.92 321.59c1.26 11.53 11.37 20 22.49 18.84l40.4-4.25c11.12-1.17 19.18-11.57 17.93-23.1L445 115c-1.31-11.58-11.42-20.06-22.54-18.89Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: egg-outline.svg
  ingredient: (
    <>
      <path
        d="M256 48C192 48 96 171.69 96 286.55S160 464 256 464s160-62.59 160-177.45S320 48 256 48Z"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32px"
      />
    </>
  ),
  // Source: calendar-outline.svg
  calendar: (
    <>
      <rect
        width="416"
        height="384"
        x="48"
        y="80"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32"
        rx="48"
      />
      <circle cx="296" cy="232" r="24" />
      <circle cx="376" cy="232" r="24" />
      <circle cx="296" cy="312" r="24" />
      <circle cx="376" cy="312" r="24" />
      <circle cx="136" cy="312" r="24" />
      <circle cx="216" cy="312" r="24" />
      <circle cx="136" cy="392" r="24" />
      <circle cx="216" cy="392" r="24" />
      <circle cx="296" cy="392" r="24" />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        d="M128 48v32M384 48v32"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32"
        d="M464 160H48"
      />
    </>
  ),
};

export const Icon: React.FC<IconProps> = ({ name, size = '1.125rem', className }) => {
  const s: React.CSSProperties = {
    width: size,
    height: size,
    display: 'inline-block',
    verticalAlign: 'middle',
    flexShrink: 0,
  };

  const content = ICON_ELEMENTS[name];
  if (!content) {
    return null;
  }

  return (
    <svg
      data-fp-component="fp.icon"
      data-fp-version="v1"
      style={s}
      viewBox="0 0 512 512"
      fill="currentColor"
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      {content}
    </svg>
  );
};

export default library.version({
  id: 'fp.icon',
  version: 'v1',
  component: Icon,
  notes: 'Round 2 visual restoration: stable mapping to stock Ionicons outline SVG paths.',
  examples: [{ name: 'Semantic icon', props: { name: 'flour' } }],
});
