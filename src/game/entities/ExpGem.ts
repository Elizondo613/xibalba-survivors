import Phaser from "phaser";

export class ExpGem {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  value: number;
  collected = false;
  magnetized = false;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    this.scene = scene;
    this.value = value;
    this.sprite = scene.physics.add.sprite(x, y, "tex-gem");
    this.sprite.setScale(value > 8 ? 3 : 2.2);
    this.sprite.setDepth(4);
    this.sprite.setTint(value > 8 ? 0xffe08a : 0x9ef2cf);
    scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 4,
      duration: 500 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  update(targetX: number, targetY: number, pickupRadius: number, magnetRadius: number) {
    if (this.collected) return;
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (dist < magnetRadius) this.magnetized = true;

    if (this.magnetized) {
      const speed = Phaser.Math.Clamp(600 - dist, 260, 700);
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      this.sprite.setVelocity(nx * speed, ny * speed);
    }

    if (dist < pickupRadius * 0.5) {
      this.collected = true;
    }
  }

  destroy() {
    this.sprite.destroy();
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }
}
