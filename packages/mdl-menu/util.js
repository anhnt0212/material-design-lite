/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

let storedTransformPropertyName_;

/**
 * Choose the correct transform property to use on the current browser.
 * @param {Object} globalObj The global object, useful for testing (defaults to window).
 * @return {string} The transform property name.
 */
function getTransformPropertyName(globalObj = window) {
  if (storedTransformPropertyName_ === undefined || globalObj !== window) {
    const el = globalObj.document.createElement('div');
    const transformPropertyName = ('transform' in el.style ? 'transform' : '-webkit-transform');

    if (globalObj === window) {
      storedTransformPropertyName_ = transformPropertyName;
    }
    return transformPropertyName;
  }

  return storedTransformPropertyName_;
}

/**
 * Clamp a value between a minimum and maximum.
 * @param {number} value The value to clamp.
 * @param {number} min The minimum allowed value.
 * @param {number} max The maximum allowed value.
 * @return {number} The clamped value.
 */
function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

// Compute a single coordinate at a position point between 0 and 1.
// c1 and c2 are the matching coordinate on control points P1 and P2, respectively.
// Control points P0 and P3 are assumed to be (0,0) and (1,1), respectively.
// Adapted from https://github.com/google/closure-library/blob/master/closure/goog/math/bezier.js.
function getBezierCoordinate_(t, c1, c2) {
  // Special case start and end.
  if (t === 0) {
    return 0;
  } else if (t === 1) {
    return 1;
  }

  // Step one - from 4 points to 3
  let ic0 = t * c1;
  let ic1 = c1 + t * (c2 - c1);
  const ic2 = c2 + t * (1 - c2);

  // Step two - from 3 points to 2
  ic0 += t * (ic1 - ic0);
  ic1 += t * (ic2 - ic1);

  // Final step - last point
  return ic0 + t * (ic1 - ic0);
}

// Project a point onto the Bezier curve, from a given X. Calculates the position t along the curve.
// Adapted from https://github.com/google/closure-library/blob/master/closure/goog/math/bezier.js.
function solvePositionFromXValue_(xVal, x1, x2) {
  // Desired precision on the computation.
  const epsilon = 1e-6;

  if (xVal <= 0) {
    return 0;
  } else if (xVal >= 1) {
    return 1;
  }

  // Initial estimate of t using linear interpolation.
  let t = xVal;

  // Try gradient descent to solve for t. If it works, it is very fast.
  let tMin = 0;
  let tMax = 1;
  let value = 0;
  for (let i = 0; i < 8; i++) {
    value = getBezierCoordinate_(t, x1, x2);
    const derivative = (getBezierCoordinate_(t + epsilon, x1, x2) - value) / epsilon;
    if (Math.abs(value - xVal) < epsilon) {
      return t;
    } else if (Math.abs(derivative) < epsilon) {
      break;
    } else {
      if (value < xVal) {
        tMin = t;
      } else {
        tMax = t;
      }
      t -= (value - xVal) / derivative;
    }
  }

  // If the gradient descent got stuck in a local minimum, e.g. because
  // the derivative was close to 0, use a Dichotomy refinement instead.
  // We limit the number of interations to 8.
  for (let i = 0; Math.abs(value - xVal) > epsilon && i < 8; i++) {
    if (value < xVal) {
      tMin = t;
      t = (t + tMax) / 2;
    } else {
      tMax = t;
      t = (t + tMin) / 2;
    }
    value = getBezierCoordinate_(t, x1, x2);
  }
  return t;
}

/**
 * Returns the easing value to apply at time t, for a given cubic bezier curve.
 * Control points P0 and P3 are assumed to be (0,0) and (1,1), respectively.
 * @param {number} time The current time in the animation, scaled between 0 and 1.
 * @param {number} x1 The x value of control point P1.
 * @param {number} y1 The y value of control point P1.
 * @param {number} x2 The x value of control point P2.
 * @param {number} y2 The y value of control point P2.
 * @return {number} The easing value to apply (between 0 and 1).
 */
function bezierProgress(time, x1, y1, x2, y2) {
  return getBezierCoordinate_(solvePositionFromXValue_(time, x1, x2), y1, y2);
}

export {getTransformPropertyName, clamp, bezierProgress};
