/**
 * The virtual joystick lives in the React/DOM layer (so it can use
 * pointer events cleanly on top of the canvas), while movement is
 * consumed inside the Phaser scene's update loop. This tiny singleton
 * is the bridge between the two — simpler and cheaper than round-
 * tripping every touch event through React state/props each frame.
 */
export const touchInputState = {
  x: 0,
  y: 0,
};

export function setTouchVector(x: number, y: number) {
  touchInputState.x = x;
  touchInputState.y = y;
}
