import Phaser from "phaser";
import { generateAllTextures } from "../utils/TextureGenerator";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    generateAllTextures(this);
    this.scene.start("GameScene");
  }
}
