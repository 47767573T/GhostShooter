/// <reference path="phaser/phaser.d.ts"/>
/// <reference path="joypad/GamePad.ts"/>


class mainState extends Phaser.State {

    game:ShooterGame;

    preload():void {
        super.preload();

        this.load.image('player', 'assets/chars/survivor1_machine.png');
        this.load.image('bullet', 'assets/chars/bulletBeigeSilver_outline.png');
        this.load.image('zombie1', 'assets/chars/zoimbie1_hold.png');
        this.load.image('zombie2', 'assets/chars/zombie2_hold.png');
        this.load.image('robot', 'assets/chars/robot1_hold.png');

        this.load.image('explosion', 'assets/effects/smokeWhite0.png');
        this.load.image('explosion2', 'assets/effects/smokeWhite1.png');
        this.load.image('explosion3', 'assets/effects/smokeWhite2.png');
        this.load.tilemap('tilemap', 'assets/tiles.json', null, Phaser.Tilemap.TILED_JSON);
        this.load.image('tiles', 'assets/tilesheet_complete.png');

        this.load.image('joystick_base', 'assets/effects/transparentDark05.png');
        this.load.image('joystick_segment', 'assets/effects/transparentDark09.png');
        this.load.image('joystick_knob', 'assets/effects/transparentDark49.png');

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

    /**
     * Crea los textos de pantalla
     */
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

    /**
     * Reproduce las explosiones al disparar el arma
     */
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

    /**
     * Crea los mueros del juego
     */
    private createWalls() {
        this.game.walls = this.game.tilemap.createLayer('walls');
        this.game.walls.x = this.world.centerX;
        this.game.walls.y = this.world.centerY;

        this.game.walls.resizeWorld();

        this.game.tilemap.setCollisionBetween(1, 195, true, 'walls');
    };

    /**
     * Crea la imagen de fondo
     */
    private createBackground() {
        this.game.background = this.game.tilemap.createLayer('background');
        this.game.background.x = this.world.centerX;
        this.game.background.y = this.world.centerY;
    };

    /**
     * Carga el mapeado de casilla
     */
    private createTilemap() {
        this.game.tilemap = this.game.add.tilemap('tilemap');
        this.game.tilemap.addTilesetImage('tilesheet_complete', 'tiles');

    };

    /**
     * Crea los monstruos de la pantalla
     */
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

    /**
     * Genera aleatoriamente una direccion en el que los monstruos comienzan
     * @param monster
     */
    private setRandomAngle(monster:Phaser.Sprite) {
        monster.angle = this.rnd.angle();
    }

    /**
     * Redirige el monstruo hacia el jugador tras cada chocue
     * @param monster
     */
    private resetMonster(monster:Phaser.Sprite) {
        monster.rotation = this.physics.arcade.angleBetween(
            monster,
            this.game.player
        );

        //monstruos enfadables cuando se chocan (STRATEGY)------------------------------------------------------------//

        var velocidadActual:number  = monster.body.velocity;
        var velocidadNueva:number = velocidadActual;

        //Control del contexto de enfado para determinar estrategia dinamicamente
        if (this.game.monsterKilled > this.game.MONSTER_KILLED_MAX){

            var motivoEnfado:MotivoEnfado = new MotivoEnfado(new MuyEnfadado());
            var velocidadNueva = motivoEnfado.aplicarVelocidad(velocidadActual);

        }else{

            var motivoEnfado:MotivoEnfado = new MotivoEnfado(new PocoEnfadado());
            var velocidadNueva = motivoEnfado.aplicarVelocidad(velocidadActual);

        }

        monster.body.velocity.setTo(velocidadNueva, velocidadNueva);
        //---------------------------------------------------------------------------------fin patron STRATEGY--------//
    }

    /**
     * Crea las balas que dispara el jugador
     */
    private createBullets() {
        this.game.bullets = this.add.group();
        this.game.bullets.enableBody = true;
        this.game.bullets.physicsBodyType = Phaser.Physics.ARCADE;

        //tipos de bala (FACTORY)-------------------------------------------------------------------------------------//
        this.game.bullets.classType = Bullet;

        //factoria de balas
        var bulletFactory:BulletFactory = new BulletFactory(this.game, this.game.world.centerX, this.game.world.centerY);

        for (var i = 0; i < this.game.BULLETS_CARTUCHO; i++) {
            var tipo:number = this.rnd.integerInRange(1,3);         //se inserta aleatoriamente el tipo de bala
            var bullet = bulletFactory.factory(tipo);

            console.log("añadida bala tipo: "+ tipo);

            this.game.bullets.add(bullet);
        }

        console.log("Cargador cargado");
        //---------------------------------------------------------------------------------fin patron FACTORY---------//

        this.game.bullets.setAll('anchor.x', 0.5);
        this.game.bullets.setAll('anchor.y', 0.5);
        this.game.bullets.setAll('scale.x', 0.5);
        this.game.bullets.setAll('scale.y', 0.5);
        this.game.bullets.setAll('outOfBoundsKill', true);
        this.game.bullets.setAll('checkWorldBounds', true);
    };

    /**
     * Crea la posibilidad de jugar con joystick
     */
    private createVirtualJoystick() {
        this.game.gamepad = new Gamepads.GamePad(this.game, Gamepads.GamepadType.DOUBLE_STICK);
    };

    /**
     * Configura la camara del juego para que siga el player
     */
    private setupCamera() {
        this.camera.follow(this.game.player);
    };

    /**
     * Creación del personaje
     */
    private createPlayer() {

        this.game.player = this.add.sprite(this.world.centerX, this.world.centerY, 'player');
        this.game.player.anchor.setTo(0.5, 0.5);

        //pieza de la armadura (DECORATOR)----------------------------------------------------------------------------//
        var guantelete:Guantelete = new Guantelete ("brazal dragon");
        var material:Material = new Oro ("guantelete de oro", guantelete);
        //---------------------------------------------------------------------------------fin patron DECORATOR-------//

        this.game.player.health = this.game.LIVES + material.endurecer();
        console.log (this.game.player.health+ " COMPROBADO DECORATOR FUNCIONA");
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

    /**
     *  Define los controles del joystick
     */
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

    /**
     * metodo que describe la causistica cuando un monstruco toca al personaje
     * @param player
     * @param monster
     */
    private monsterTouchesPlayer(player:Phaser.Sprite, monster:Phaser.Sprite) {
        monster.kill();

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

    /**
     * Reinicia el juego
     */
    restart() {
        this.game.state.restart();
    }

    /**
     * Metodo que define la causistica cuando una bala toca las paredes.
     * @param bullet
     * @param walls
     */
    private bulletHitWall(bullet:Phaser.Sprite, walls:Phaser.TilemapLayer) {
        this.explosion(bullet.x, bullet.y);
        bullet.kill();
    }

    /**
     * Metodo que define la causistica cuando una bala toca un monstruo
     * @param bullet
     * @param monster
     */
    private bulletHitMonster(bullet:Phaser.Sprite, monster:Phaser.Sprite) {

        bullet.kill();

        //El daño cambia segun tipo de bala que impacta (FACTORY)-----------------------------------------------------//
        monster.damage(bullet.components._BULLET_DAMAGE);


        this.explosion(bullet.x, bullet.y);

        if (monster.health > 0) {
            this.blink(monster)
        } else {
            this.game.score += 10;
            this.game.scoreText.setText("Score: " + this.game.score);
        }
    }

    /**
     * Efecto parapadeo de monstruos o jugador cuando es dañado
     * @param sprite
     */
    blink(sprite:Phaser.Sprite) {
        var tween = this.add.tween(sprite)
            .to({alpha: 0.5}, 100, Phaser.Easing.Bounce.Out)
            .to({alpha: 1.0}, 100, Phaser.Easing.Bounce.Out);

        tween.repeat(3);
        tween.start();
    }

    /**
     * Ajuste de movimiento de todos los mosntruos del grupo de monstruos
     */
    private moveMonsters() {
        this.game.monsters.forEach(this.advanceStraightAhead, this)
    };

    /**
     * Definición de velocidad y direccion de monstruos hacia jugador
     * @param monster
     */
    private advanceStraightAhead(monster:Phaser.Sprite) {
        this.physics.arcade.velocityFromAngle(monster.angle, this.game.MONSTER_SPEED, monster.body.velocity);
    }

    /**
     * definición de accion de botones de disparo del personaje
     */
    private fireWhenButtonClicked() {
        if (this.input.activePointer.isDown) {
            this.fire();
        }
    };

    /**
     * definición de rotar el personaje hacia el puntero del raton
     */
    private rotatePlayerToPointer() {
        this.game.player.rotation = this.physics.arcade.angleToPointer(
            this.game.player,
            this.input.activePointer
        );
    };

    /**
     * Definición de controles de movimiento del personaje con teclado y/o joystick
     */
    private movePlayer() {
        var moveWithKeyboard = function () {
            if (this.game.cursors.left.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.A)) {
                this.game.player.body.acceleration.x = -this.PLAYER_ACCELERATION;
            } else if (this.game.cursors.right.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.D)) {
                this.game.player.body.acceleration.x = this.PLAYER_ACCELERATION;
            } else if (this.game.cursors.up.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.W)) {
                this.game.player.body.acceleration.y = -this.PLAYER_ACCELERATION;
            } else if (this.game.cursors.down.isDown ||
                this.input.keyboard.isDown(Phaser.Keyboard.S)) {
                this.game.player.body.acceleration.y = this.PLAYER_ACCELERATION;
            } else {
                this.game.player.body.acceleration.x = 0;
                this.game.player.body.acceleration.y = 0;
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

    /**
     * Metodo de definición de la accion de disparar balas del personaje
     */
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

                //La velocidad cambia segun tipo de bala (FACTORY)----------------------------------------------------//
                var velocity = this.physics.arcade.velocityFromRotation(bullet.rotation, bullet._BULLET_SPEED);

                bullet.body.velocity.setTo(velocity.x, velocity.y);

                this.game.nextFire = this.time.now + this.game.FIRE_RATE;
            }
        }
    }

    /**
     * Metodo que define las explosiones al disparar el arma
     * @param x
     * @param y
     */
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

    //vars PLAYER
    PLAYER_ACCELERATION = 500;
    PLAYER_MAX_SPEED = 400;
    PLAYER_DRAG = 600;
    LIVES = 3;

    //vars MONSTERS
    MONSTER_SPEED = 100;
    MONSTER_HEALTH = 3;
    MONSTER_KILLED_MAX = 5; //Variable para controlar cuando se enfada un zombie (STRATEGY)
    monsterKilled = 0;      //Contador hasta llegar a un contexto de enfado zombie (STRATEGY)


    //vars BULLETS
    BULLETS_CARTUCHO = 20;
    FIRE_RATE = 200;

    //vars others
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//---------------------------------------STRATEGY---------------------------------------------------------------------//
//------------strategy para crear varios tipos de conducta de los monstruos cuando chocan-----------------------------//
//------------la conducta hace cambiar la velocidad del monster cuando esta enfadado----------------------------------//

//Strategy: Estategia General
interface Enfadable { velocidad(velocidadActual:number): number; }

//Strategy: Estategia Concreta
class MuyEnfadado implements Enfadable {
    velocidadPlus:number = 200;

    public velocidad(velocidadActual:number): number{

        if (velocidadActual == 800) console.log ("CUIDADO ZOMBIE RABIOSO")

        return velocidadActual + this.velocidadPlus;
    }
}

//Strategy: Estategia Concreta
class PocoEnfadado implements Enfadable {
    velocidadPlus:number = 50;

    public velocidad(velocidadActual:number): number{

        if (velocidadActual == 800) console.log ("CUIDADO ZOMBIE RABIOSO")

        return velocidadActual + this.velocidadPlus;
    }
}

//Strategy: Contexto para aplicar la estrategia
class MotivoEnfado {
    private enfadable:Enfadable;

    constructor (enfadable:Enfadable){ this.enfadable = enfadable; }

    public aplicarVelocidad(velocidadActual:number): number {
        return this.enfadable.velocidad(velocidadActual);
    }

}


//---------------------------------------FACTORY----------------------------------------------------------------------//
//------------factory para crear varios tipos de balas que se diferencian en el daño o la velocidad-------------------//
//--------------------------------------------------------------------------------------------------------------------//

//Factory: Producto general
class Bullet extends Phaser.Sprite{

    game:ShooterGame;
    public _BULLET_DAMAGE:number;
    public _BULLET_SPEED:number;

    constructor(game:ShooterGame, x:number, y:number, key:string|Phaser.RenderTexture|Phaser.BitmapData|PIXI.Texture, frame:string|number) {
        super(game, x, y, key, frame);
        this.game = game;
    }

    update():void{ super.update(); }
}

//Factory: Factoria de Productos
class BulletFactory {

    game:ShooterGame;
    texture:string = 'bullet';
    x:number;
    y:number;

    constructor(game:ShooterGame, x:number, y:number) {
        this.game = game;
        this.x = x;
        this.y = y;
    }

    //factoria de 3 tipos de balas segun caracteristicas de cada bala
    factory(key:number|Phaser.RenderTexture|Phaser.BitmapData|PIXI.Texture):Bullet
    {
        switch (key){
            case 1: return new BalaNormal(this.game, this.x, this.y, this.texture, 0);

            case 2: return new BalaHueca(this.game, this.x, this.y, this.texture, 0);

            case 3: return new BalaFina(this.game, this.x, this.y, this.texture, 0);

            default: return null;
        }
    }
}

//Factory: Producto concreto
class BalaNormal extends Bullet {

    constructor(game:ShooterGame, x:number, y:number, key:string|Phaser.RenderTexture|Phaser.BitmapData|PIXI.Texture
        , frame:string|number) {

        super(game, x, y, key, frame);
        this._BULLET_DAMAGE = 2;
        this._BULLET_SPEED = 800;
    }

    update():void { super.update();}
}

//Factory: Producto concreto
class BalaHueca extends Bullet {

    constructor(game:ShooterGame, x:number, y:number, key:string|Phaser.RenderTexture|Phaser.BitmapData|PIXI.Texture
        , frame:string|number) {

        super(game, x, y, key, frame);
        this._BULLET_DAMAGE = 3;
        this._BULLET_SPEED = 200;
    }

    update():void {super.update();}
}

//Factory: Producto concreto
class BalaFina extends Bullet {

    constructor(game:ShooterGame, x:number, y:number, key:string|Phaser.RenderTexture|Phaser.BitmapData|PIXI.Texture
        , frame:string|number) {

        super(game, x, y, key, frame);
        this._BULLET_DAMAGE = 1;
        this._BULLET_SPEED = 1600;
    }

    update():void {super.update();}
}


//---------------------------------------DECORATOR--------------------------------------------------------------------//
//------------decorator para representar la defensa de armadura dinamica del jugador----------------------------------//
//------------que depende de la pieza del material--------------------------------------------------------------------//

//Decorator: Componente general
interface Armadura {
    endurecer(): number;
}

//Decorator: Componente concreto
class Guantelete implements Armadura {
    private pieza:String;

    constructor(pieza:String) {
        this.pieza = pieza;
    }

    public endurecer(): number {
        console.log(this.pieza+" equipada.")
        return 1;
    }
}

//Decorator: Decorador general
class Material implements Armadura{
    private armadura:Armadura;
    private _pieza:String;

    constructor(pieza:String, armadura:Armadura){
        this._pieza = pieza;
        this.armadura = armadura;
    }

    get pieza(): String{
        return this._pieza;
    }

    public endurecer(): number {
        console.log(this._pieza + "equipada");
        return 1 + this.armadura.endurecer();
    }
}

//Decorator: Decorador concreto
class Oro extends Material {

    constructor(pieza:String, armadura:Armadura){
        super(pieza, armadura);
    }

    public endurecer(): number{
        return 1 + super.endurecer();
    }
}

//Decorator: Decorador concreto
class Titanio extends Material {

    constructor(tipo:String, armadura:Armadura){
        super(tipo, armadura);
    }

    public endurecer(): number{
        console.log("pieza de titanio en armadura");
        return 2 + super.endurecer();
    }
}