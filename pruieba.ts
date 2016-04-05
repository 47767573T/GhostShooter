/**
 * Created by 47767573t on 05/04/16.
 */

class prueba extends mainState{

    private createMonsters() {
        this.monsters = this.add.group();
        this.monsters.enableBody = true;
        this.monsters.physicsBodyType = Phaser.Physics.ARCADE;

        this.tilemap.createFromObjects('monsters', 541, 'zombie1', 0, true, false, this.monsters);

        this.monsters.setAll('anchor.x', 0.5);
        this.monsters.setAll('anchor.y', 0.5);
        //this.monsters.setAll('scale.x', 2);
        //this.monsters.setAll('scale.y', 2);
        this.monsters.setAll('health', this.MONSTER_HEALTH);
        this.monsters.forEach(this.setRandomAngle, this);
        this.monsters.forEach((explosion:Phaser.Sprite) => {
            explosion.loadTexture(this.rnd.pick(['zombie1', 'zombie2', 'robot']));
        }, this);

        this.monsters.setAll('checkWorldBounds', true);
        this.monsters.callAll('events.onOutOfBounds.add', 'events.onOutOfBounds', this.resetMonster, this);
    };


}

