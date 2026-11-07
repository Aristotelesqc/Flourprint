import type { ProcessStep } from '@flourprint/core/domain';

/* Stock Ionicons outline glyphs from the frozen #133 operation pictograms.
The MIT License (MIT)

Copyright (c) 2015-present Ionic (http://ionic.io/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
const glyphs = {
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
};

export function StepOperationIcon({ operation }: { readonly operation: ProcessStep['operation'] }) {
  const glyph = ['bake', 'boil', 'preheat'].includes(operation)
    ? 'oven'
    : operation === 'scald'
      ? 'temperature'
      : ['mix', 'knead', 'fold', 'shape', 'divide'].includes(operation)
        ? 'ingredient'
        : 'clock';
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      stroke="currentColor"
      className="size-4"
      aria-hidden="true"
    >
      {glyphs[glyph]}
    </svg>
  );
}
