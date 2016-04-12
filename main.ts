/// <reference path="phaser/phaser.d.ts"/>
/// <reference path="joypad/GamePad.ts"/>


class mainState extends Phaser.State {

    game:ShooterGame;

    preload():void {
        super.preload();


        this.load.image('player', 'assets/survivor1_machine.png');
        this.load.image('bullet', 'assets/bulletBeigeSilver_outline.png');
        this.load.image('zombie1', 'assets/zoimbie1_hold.png');
        this.load.image('zombie2', 'assets/zombie2_hold.png');
        this.load.image('robot', 'assets/robot1_hold.png');

        this.load.image('explosion', 'assets/smokeWhite0.png');
        this.load.image('explosion2', 'assets/smokeWhite1.png');
        this.load.image('explosion3', 'assets/smokeWhite2.png');
        this.load.tilemap('tilemap', 'assets/tiles.json', null, Phaser.Tilemap.TILED_JSON);
        this.load.image('tiles', 'assets/tilesheet_complete.png');

        this.load.image('joystick_base', 'assets/transparentDark05.png');
        this.load.image('joystick_segment', 'assets/transparentDark09.png');
        this.load.image('joystick_knob', 'assets/transparentDark49.png');

        this.physics.startSystem(Phaser.Physics.ARCADE);

        if (this.game.device.desktop) {
            this.game.cursors = this.input.keyboard.createCursorKeys();
        } else {
            this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
            this.scale.pageAlignHorizontally = true;
            this.scale.pageAlignVertically = true;
            this.scale.pageAlignHorizontally = true;
            this.scale.pageAlignVertically = true;
            this.scale.forceOrientation(true);
            this.scale.startFullScreen(false);
        }
    }

    create():void {
        super.create();

        this.createTilemap();
        this.createBackground();
        this.createWalls();
        this.createExplosions();
        this.createBullets();
        this.createPlayer();
        this.setupCamera();
        this.createMonsters();
        this.createTexts();

        if (!this.game.device.desktop) {
            this.createVirtualJoystick();
        }
    }

    private createTexts() {
        var width = this.scale.bounds.width;
        var height = this.scale.bounds.height;

        this.game.scoreText = this.add.text(this.game.TEXT_MARGIN
            , this.game.TEXT_MARGIN
            , 'Score: ' + this.game.score
            , {font: "30px Arial", fill: "#ffffff"}
        );

        this.game.scoreText.fixedToCamera = true;
        this.game.livesText = this.add.text(width - this.game.TEXT_MARGIN
            , this.game.TEXT_MARGIN
            , 'Lives: ' + this.game.player.health
            , {font: "30px Arial", fill: "#ffffff"}
        );

        this.game.livesText.anchor.setTo(1, 0);
        this.game.livesText.fixedToCamera = true;

        this.game.stateText = this.add.text(width / 2
            , height / 2
            , ''
            , {font: '84px Arial', fill: '#fff'}
        );

        this.game.stateText.anchor.setTo(0.5, 0.5);
        this.game.stateText.visible = false;
        this.game.stateText.fixedToCamera = true;
    };

    private createExplosions() {
        this.game.explosions = this.add.group();
        this.game.explosions.createMultiple(20, 'explosion');

        this.game.explosions.setAll('anchor.x', 0.5);
        this.game.explosions.setAll('anchor.y', 0.5);

        this.game.explosions.forEach((explosion:Phaser.Sprite) => {
            explosion.loadTexture(this.rnd.pick(['explosion'
                , 'explosion2'
                , 'explosion3'
            ]));
        }, this);
    };

    private createWalls() {
        this.game.walls = this.game.tilemap.createLayer('walls');
        this.game.walls.x = this.world.centerX;
        this.game.walls.y = this.world.centerY;

        this.game.walls.resizeWorld();

        this.game.tilemap.setCollisionBetween(1, 195, true, 'walls');
    };

    private createBackground() {
        this.game.background = this.game.tilemap.createLayer('background');
        this.game.background.x = this.world.centerX;
        this.game.background.y = this.world.centerY;
    };

    private createTilemap() {
        this.game.tilemap = this.game.add.tilemap('tilemap');
        this.game.tilemap.addTilesetImage('tilesheet_complete', 'tiles');

    };

    private createMonsters() {
        this.game.monsters = this.add.group();
        this.game.monsters.enableBody = true;
        this.game.monsters.physicsBodyType = Phaser.Physics.ARCADE;

        this.game.tilemap.createFromObjects('monsters'
            , 541
            , 'zombie1'
            , 0, true, false, this.game.monsters);

        this.game.monsters.setAll('anchor.x', 0.5);
        this.game.monsters.setAll('anchor.y', 0.5);
        this.game.monsters.setAll('health', this.game.MONSTER_HEALTH);
        this.game.monsters.forEach(this.setRandomAngle, this);
        this.game.monsters.forEach((explosion:Phaser.Sprite) => {
            explosion.loadTexture(this.rnd.pick(['zombie1'
                , 'zombie2'
                , 'robot'])
            );
        }, this);

        this.game.monsters.setAll('checkWorldBounds', true);
        this.game.monsters.callAll('events.onOutOfBounds.add'
            , 'events.onOutOfBounds'
            , this.resetMonster, this);
    };

    private setRandomAngle(monster:Phaser.Sprite) {
        monster.angle = this.rnd.angle();
    }

    private resetMonster(monster:Phaser.Sprite) {
        monster.rotation = this.physics.arcade.angleBetween(
            monster,
            this.game.player
        );
    }

    private createBullets() {
        this.game.bullets = this.add.group();
        this.game.bullets.enableBody = true;
        this.game.bullets.physicsBodyType = Phaser.Physics.ARCADE;
        this.game.bullets.createMultiple(20, 'bullet');

        this.game.bullets.setAll('anchor.x', 0.5);
        this.game.bullets.setAll('anchor.y', 0.5);
        this.game.bullets.setAll('scale.x', 0.5);
        this.game.bullets.setAll('scale.y', 0.5);
        this.game.bullets.setAll('outOfBoundsKill', true);
        this.game.bullets.setAll('checkWorldBounds', true);
    };

    private createVirtualJoystick() {
        this.game.gamepad = new Gamepads.GamePad(this.game, Gamepads.GamepadType.DOUBLE_STICK);
    };

    private setupCamera() {
        this.camera.follow(this.game.player);
    };

    private createPlayer() {
        this.game.player = this.add.sprite(this.world.centerX, this.world.centerY, 'player');
        this.game.player.anchor.setTo(0.5, 0.5);
        //this.player.scale.setTo(2, 2);
        this.game.player.health = this.game.LIVES;
        this.physics.enable(this.game.player, Phaser.Physics.ARCADE);

        this.game.player.body.maxVelocity.setTo(this.game.PLAYER_MAX_SPEED
            , this.game.PLAYER_MAX_SPEED); // x, y
        this.game.player.body.collideWorldBounds = true;
        this.game.player.body.drag.setTo(this.game.PLAYER_DRAG
            , this.game.PLAYER_DRAG); // x, y
    };

    update():void {
        super.update();
        this.movePlayer();
        this.moveMonsters();

        if (this.game.device.desktop) {
            this.rotatePlayerToPointer();
            this.fireWhenButtonClicked();
        } else {

            this.rotateWithRightStick();
            this.fireWithRightStick();
        }

        this.physics.arcade.collide(this.game.player, this.game.monsters, this.monsterTouchesPlayer, null, this);
        this.physics.arcade.collide(this.game.player, this.game.walls);
        this.physics.arcade.overlap(this.game.bullets, this.game.monsters, this.bulletHitMonster, null, this);
        this.physics.arcade.collide(this.game.bullets, this.game.walls, this.bulletHitWall, null, this);
        this.physics.arcade.collide(this.game.walls, this.game.monsters, this.resetMonster, null, this);
        this.physics.arcade.collide(this.game.monsters, this.game.monsters, this.resetMonster, null, this);
    }

    rotateWithRightStick() {
        var speed = this.game.gamepad.stick2.speed;

        if (Math.abs(speed.x) + Math.abs(speed.y) > 20) {
            var rotatePos = new Phaser.Point(this.game.player.x + speed.x, this.game.player.y + speed.y);
            this.game.player.rotation = this.physics.arcade.angleToXY(this.game.player, rotatePos.x, rotatePos.y);

            this.fire();
        }
    }

    fireWithRightStick() {
        //this.gamepad.stick2.
    }

    private monsterTouchesPlayer(player:Phaser.Sprite, monster:Phaser.Sprite) {
        monster.kill();

        monster = new ArmaduraDebil(monster);

        player.damage(1);

        this.game.livesText.setText("Lives: " + this.game.player.health);

        this.blink(player);

        if (player.health == 0) {
            this.game.stateText.text = " GAME OVER \n Click to restart";
            this.game.stateText.visible = true;

            //the "click to restart" handler
            this.input.onTap.addOnce(this.restart, this);
        }
    }

    restart() {
        this.game.state.restart();
    }

    private bulletHitWall(bullet:Phaser.Sprite, walls:Phaser.TilemapLayer) {
        this.explosion(bullet.x, bullet.y);
        bullet.kill();
    }

    private bulletHitMonster(bullet:Phaser.Sprite, monster:Phaser.Sprite) {
        bullet.kill();
        monster.damage(1);


        this.explosion(bullet.x, bullet.y);

        if (monster.health > 0) {
            this.blink(monster)
        } else {
            this.game.score += 10;
            this.game.scoreText.setText("Score: " + this.game.score);
        }
    }

    blink(sprite:Phaser.Sprite) {
        var tween = this.add.tween(sprite)
            .to({alpha: 0.5}, 100, Phaser.Easing.Bounce.Out)
            .to({alpha: 1.0}, 100, Phaser.Easing.Bounce.Out);

        tween.repeat(3);
        tween.start();
    }

    private moveMonsters() {
        this.game.monsters.forEach(this.advanceStraightAhead, this)
    };

    private advanceStraightAhead(monster:Phaser.Sprite) {
        this.physics.arcade.velocityFromAngle(monster.angle, this.game.MONSTER_SPEED, monster.body.velocity);
    }

    private fireWhenButtonClicked() {
        if (this.input.activePointer.isDown) {
            this.fire();
        }
    };

    private rotatePlayerToPointer() {
        this.game.player.rotation = this.physics.arcade.angleToPointer(
            this.game.player,
            this.input.activePointer
        );
    };

    private movePlayer() {
        var moveWithKeyboard = function () {
            if (this.cursors.left.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.A)) {
                this.player.body.acceleration.x = -this.PLAYER_ACCELERATION;
            } else if (this.cursors.right.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.D)) {
                this.player.body.acceleration.x = this.PLAYER_ACCELERATION;
            } else if (this.cursors.up.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.W)) {
                this.player.body.acceleration.y = -this.PLAYER_ACCELERATION;
            } else if (this.cursors.down.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.S)) {
                this.player.body.acceleration.y = this.PLAYER_ACCELERATION;
            } else {
                this.player.body.acceleration.x = 0;
                this.player.body.acceleration.y = 0;
            }
        };

        var moveWithVirtualJoystick = function () {
            if (this.gamepad.stick1.cursors.left) {
                this.player.body.acceleration.x = -this.PLAYER_ACCELERATION;
            }
            if (this.gamepad.stick1.cursors.right) {
                this.player.body.acceleration.x = this.PLAYER_ACCELERATION;
            } else if (this.gamepad.stick1.cursors.up) {
                this.player.body.acceleration.y = -this.PLAYER_ACCELERATION;
            } else if (this.gamepad.stick1.cursors.down) {
                this.player.body.acceleration.y = this.PLAYER_ACCELERATION;
            } else {
                this.player.body.acceleration.x = 0;
                this.player.body.acceleration.y = 0;
            }
        };
        if (this.game.device.desktop) {
            moveWithKeyboard.call(this);
        } else {
            moveWithVirtualJoystick.call(this);
        }
    };

    fire():void {
        if (this.time.now > this.game.nextFire) {
            var bullet = this.game.bullets.getFirstDead();
            if (bullet) {
                var length = this.game.player.width * 0.5 + 20;
                var x = this.game.player.x + (Math.cos(this.game.player.rotation) * length);
                var y = this.game.player.y + (Math.sin(this.game.player.rotation) * length);

                bullet.reset(x, y);

                this.explosion(x, y);

                bullet.angle = this.game.player.angle;

                var velocity = this.physics.arcade.velocityFromRotation(bullet.rotation, this.game.BULLET_SPEED);

                bullet.body.velocity.setTo(velocity.x, velocity.y);

                this.game.nextFire = this.time.now + this.game.FIRE_RATE;
            }
        }
    }

    explosion(x:number, y:number):void {
        var explosion:Phaser.Sprite = this.game.explosions.getFirstDead();
        if (explosion) {
            explosion.reset(
                x - this.rnd.integerInRange(0, 5) + this.rnd.integerInRange(0, 5),
                y - this.rnd.integerInRange(0, 5) + this.rnd.integerInRange(0, 5)
            );
            explosion.alpha = 0.6;
            explosion.angle = this.rnd.angle();
            explosion.scale.setTo(this.rnd.realInRange(0.5, 0.75));

            this.add.tween(explosion.scale).to({x: 0, y: 0}, 500).start();
            var tween = this.add.tween(explosion).to({alpha: 0}, 500);
            tween.onComplete.add(() => {
                explosion.kill();
            });
            tween.start();
        }

    }
}



class ShooterGame extends Phaser.Game {

    player:Phaser.Sprite;
    cursors:Phaser.CursorKeys;
    bullets:Phaser.Group;
    tilemap:Phaser.Tilemap;
    background:Phaser.TilemapLayer;
    walls:Phaser.TilemapLayer;
    monsters:Phaser.Group;
    explosions:Phaser.Group;
    scoreText:Phaser.Text;
    livesText:Phaser.Text;
    stateText:Phaser.Text;
    gamepad:Gamepads.GamePad;

    PLAYER_ACCELERATION = 500;
    PLAYER_MAX_SPEED = 400; // pixels/second
    PLAYER_DRAG = 600;
    MONSTER_SPEED = 100;
    BULLET_SPEED = 800;
    MONSTER_HEALTH = 3;
    FIRE_RATE = 200;
    LIVES = 3;
    TEXT_MARGIN = 50;

    nextFire = 0;
    score = 0;

    constructor() {
        super(800, 480, Phaser.CANVAS, 'gameDiv');
        this.state.add('main', mainState);
        this.state.start('main');
    }
}

window.onload = () => { new ShooterGame(); };


interface Monster {
    life;

    Armar(): void;
}

class ZombieA implements Monster {
    life = 1;

    ZombieA(){  }
    Armar(){ return 1; }
}

class ZombieB implements Monster{

    ZombieB(){  }
    Armar(){ return 1; }
}

class Robot implements Monster{

    Robot() { }
    hp() { return 2; }
}

//---------------------------------------DECORATOR--------------------------------------------------------------------//
//------------decorator para representar aumento de vida o armadura dinamicamente-------------------------------------//

// clase decorator que ñade resistencia
abstract class Armadura { }

class ArmaduraDebil implements Armadura {
    monster:Monster;

    public hp(): int { return this.monster.hp() + 1}

    constructor( monster:Monster ) { this.monster = monster }
}

class ArmaduraFuerte implements Armadura {
    monster:Monster;
    hp () { return this.monster.hp() + 2}

    constructor( monster:Monster ) { this.monster = monster }
}


//https://github.com/torokmark/design_patterns_in_typescript