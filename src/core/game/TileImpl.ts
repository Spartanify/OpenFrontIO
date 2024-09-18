import {Tile, Cell, TerrainType, Player, TerraNullius, MutablePlayer} from "./Game";
import {Terrain} from "./TerrainMapLoader";
import {GameImpl} from "./GameImpl";
import {PlayerImpl} from "./PlayerImpl";
import {TerraNulliusImpl} from "./TerraNulliusImpl";


export class TileImpl implements Tile {

    public _isBorder = false;
    private _neighbors: Tile[] = null;

    constructor(
        private readonly gs: GameImpl,
        public _owner: PlayerImpl | TerraNulliusImpl,
        private readonly _cell: Cell,
        private readonly _terrain: Terrain
    ) { }

    neighborsWrapped(): Tile[] {
        const x = this._cell.x;
        const y = this._cell.y;
        const ns: Tile[] = [];

        // Check top neighbor
        if (y > 0) {
            ns.push(this.gs.map[x][y - 1]);
        } else {
            ns.push(this.gs.map[x][this.gs.height() - 1]);
        }

        // Check bottom neighbor
        if (y < this.gs.height() - 1) {
            ns.push(this.gs.map[x][y + 1]);
        } else {
            ns.push(this.gs.map[x][0]);
        }

        // Check left neighbor (wrap around)
        if (x > 0) {
            ns.push(this.gs.map[x - 1][y]);
        } else {
            ns.push(this.gs.map[this.gs.width() - 1][y]);
        }

        // Check right neighbor (wrap around)
        if (x < this.gs.width() - 1) {
            ns.push(this.gs.map[x + 1][y]);
        } else {
            ns.push(this.gs.map[0][y]);
        }
        return ns;
    }
    isLake(): boolean {
        return !this.isLand() && !this.isOcean();
    }
    isOcean(): boolean {
        return this._terrain.ocean;
    }
    magnitude(): number {
        return this._terrain.magnitude;
    }
    isShore(): boolean {
        return this.isLand() && this._terrain.shoreline;
    }
    isOceanShore(): boolean {
        return this.isShore() && this.neighbors().filter(n => n.isOcean()).length > 0;
    }
    isShorelineWater(): boolean {
        return this.isWater() && this._terrain.shoreline;
    }
    isLand(): boolean {
        return this._terrain.land;
    }
    isWater(): boolean {
        return !this._terrain.land;
    }
    terrain(): TerrainType {
        return this._terrain.type;
    }

    borders(other: Player | TerraNullius): boolean {
        for (const n of this.neighbors()) {
            if (n.owner() == other) {
                return true;
            }
        }
        return false;
    }

    onShore(): boolean {
        return this.neighbors()
            .filter(t => t.isWater())
            .length > 0;
    }

    hasOwner(): boolean {return this._owner != this.gs._terraNullius;}
    owner(): MutablePlayer | TerraNullius {return this._owner;}
    isBorder(): boolean {return this._isBorder;}
    isInterior(): boolean {return this.hasOwner() && !this.isBorder();}
    cell(): Cell {return this._cell;}

    neighbors(): Tile[] {
        if (this._neighbors == null) {
            this._neighbors = this.gs.neighbors(this);
        }
        return this._neighbors;
    }
}