export class SBBActor extends Actor {

    async _preCreate(data, options, user) {
        await super._preCreate(data, options, user);

        // Sets Actors to always have sbb as a source
        // Vehicle always have a crew list
        if(this.type == "Vehicle"){
            this.updateSource({
                flags:{
                    sbb:{
                        crew:{
                            list:[],
                            roles: Array(CONFIG.SBB.vehicleRoles.length).fill(""),
                            amount: Array(CONFIG.SBB.vehicleRoles.length).fill(0)
                        }
                    }
                }
            });
        }
        else{
            this.updateSource({
                flags:{
                    sbb:{}
                }
            });
        }
    }

    prepareBaseData() {
        super.prepareBaseData();

        const config = CONFIG.SBB;
        const type = this.type;

        // Update deprived data values based on actor type
        if (type == "Character") {
            this._updateChar(config);
        } else if (type == "NPC") {
            this._updateNPC(config);
        } else if(type == "Vehicle"){
            this._updateVehicle(config);
        }
    }

    prepareEmbeddedDocuments() {
        if(this.type == "Character" || this.type == "NPC"){
            // If active effects change HP or strain we want to also heal that amount
            // prepareEmbeddedDocuments() is where active effects are applied
            let systemData = this.system;

            let hp = systemData.HP.max;
            let strain = systemData.strain.max;

            super.prepareEmbeddedDocuments();

            let hpChange = systemData.HP.max - hp;
            let strainChange = systemData.strain.max - strain;

            if(hpChange > 0){
                systemData.HP.value+= hpChange;
            }
            if(strainChange > 0){
                systemData.strain.value+= strainChange;
            }
        }
        else {
            super.prepareEmbeddedDocuments();
        }
    }

    _updateChar(config){
        let attributes = this.system.attributes;

        this._updateHPChar(attributes.fortitude.rank, config);
        this._updateStrainChar(attributes.willpower.rank, config);
        this._updateSpeedChar(attributes.move.rank, config);
    }

    _updateNPC(config){
        let rank = this.system.rank;

        this._updateHPChar(rank, config);
        this._updateStrainChar(rank, config);
        this._updateSpeedChar(rank, config);
    }

    _updateVehicle(config){
        let systemData = this.system;

        systemData.HP.max = systemData.HP.base + systemData.modifiers.HP;

        // // Work out how much power is being used
        // let powerUsage = 0;
        // for (const [key, value] of Object.entries(this.items.entries)) {
        //     powerUsage += value.system?.power;
        // }
        //
        // systemData.power.remaining = systemData.power.base - powerUsage;
    }

    _updateHPChar(attribute, config){
        let systemData = this.system;

        systemData.HP.max =config.settings.hpBase +
            attribute * config.settings.hpFortMod
            + systemData.modifiers.HP;

        // check if HP needs to be changed
        if(systemData.HP.value > systemData.HP.max)
            systemData.HP.value = systemData.HP.max;
    }

    _updateStrainChar(attribute, config){
        let systemData = this.system;

        systemData.strain.max =config.settings.strainBase +
            attribute * config.settings.strainBufferWillMod
            + systemData.modifiers.strain;

        // check if strain max needs to be changed
        if(systemData.strain.value > systemData.strain.max)
            systemData.strain.value = systemData.strain.max;
    }

    _updateSpeedChar(attribute, config){
        let systemData = this.system;

        systemData.speed =config.settings.speedBase +
            attribute * config.settings.speedMoveMod
            + systemData.modifiers.speedBonus;
    }
}