import * as Dice from "../helpers/dice.mjs";
import * as Helper from "../helpers/actor-helper.mjs";

export class SBBCharacterSheet extends ActorSheet{

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["character", "sheet", "actor"],
            template: "systems/sbb/templates/sheets/actors/Character-sheet.hbs",
            width: 600,
            height: 800,
            tabs: [{navSelector: ".main-tabs", contentSelector: ".sheet-body", initial: "main"},
                {navSelector: ".tenet-focus-tabs", contentSelector: ".tenet-content", initial: "tenet"},
                {navSelector: ".skills-tabs", contentSelector: ".skills-content", initial: "Body"}
            ],
        });
    }

    _itemContextMenu =
        [
            {
                name: game.i18n.localize("SBB.common.edit"),
                icon : '<i class="fas fa-edit"></i>',
                callback: element=>{
                    const itemID = element[0].dataset.type;
                    const item = (this.actor.items.get(itemID));
                    item.sheet.render(true);
                }},
            {
                name: game.i18n.localize("SBB.common.delete"),
                icon : '<i class="fas fa-trash"></i>',
                callback: element =>{
                    const itemID = element[0].dataset.type;
                    const item = (this.actor.items.get(itemID));
                    item.delete();
                }}
        ];

    _skillContextMenu=
        [
            {
        name: game.i18n.localize("SBB.sills.add_rank"),
        icon: '<i class="fas fa-plus"></i>',
        callback: element => {
            const itemID = element[0].dataset.type;
            const item = (this.actor.items.get(itemID));
            const newRank = this._checkSkillRank(item.system.Rank+1)
            item.update({"system.Rank": newRank})
        }},{
        name: game.i18n.localize("SBB.sills.sub_rank"),
        icon: '<i class="fas fa-plus"></i>',
        callback: element => {
            const itemID = element[0].dataset.type;
            const item = (this.actor.items.get(itemID));
            const newRank = this._checkSkillRank(item.system.Rank-1)
            item.update({"system.Rank": newRank})
        }}
        ].concat(this._itemContextMenu);

    getData() {
        const data = super.getData();
        const actorData = this.actor.system;
        data.config = CONFIG.SBB;

        // Update deprived data values
        actorData.HP.max = actorData.attributes.Fortitude * data.config.settings.hpFortMod;
        actorData.Strain.max = actorData.attributes.Willpower * data.config.settings.hpFortMod;

        // Item filters
        data.feats =  data.items.filter(function (item) {return item.type == "Feat"});
        data.tenets =  data.items.filter(function (item) {return item.type == "Tenet"});
        data.focuses =  data.items.filter(function (item) {return item.type == "Focus"});
        data.attacks =  data.items.filter(function (item) {return item.type == "Weapon"});
        data.ammo =  data.items.filter(function (item) {return item.type == "Ammunition"});

        let skills = data.items.filter(function (item) {return item.type == "Skill"});

        data.skills =  {
            "Body" : skills.filter(function (item) {return item.system.Attribute=="Body"}),
            "Control" : skills.filter(function (item) {return item.system.Attribute=="Control"}),
            "Intelligence" : skills.filter(function (item) {return item.system.Attribute=="Intelligence"}),
            "Presence" : skills.filter(function (item) {return item.system.Attribute=="Presence"}),
            "Technique" : skills.filter(function (item) {return item.system.Attribute=="Technique"})
        };

        return data;
    }

    // Used for interacting with the sheet while its open!
    activateListeners(html) {
        // non editors
        html.find(".toggle-description").click(this._toggleLastFamily.bind(this));
        html.find(".tenet-focus-card").click(this._tenetSwitch.bind(this));
        html.find(".item-rollable").click(this._itemRoll.bind(this));
        html.find(".save-roll").click(this._rollSave.bind(this));

        //Edit Listeners
        if(this.isEditable) {
            html.find(".attributes-input").change(Helper.checkvalBetween.bind(this, 1, 10));
            html.find(".xp-input").change(this._forceRoundDown.bind(this));
            html.find(".health-input").change(Helper.checkvalBetween.bind(this, 0, this.actor.system.HP.max));
            html.find(".strain-marker").click(this._onStrainChange.bind(this));
            html.find(".add-item-button").click(Helper.addItem.bind(this));
            html.find(".add-skill-button").click(Helper.addItem.bind(this));
            html.find(".inline-edit").change(this._updateSkill.bind(this));

            // strain reset context menu
            new ContextMenu(html, ".strain-marker", [{
                name:  game.i18n.localize("SBB.common.clear_strain"),
                icon:     '<i class="fas fa-edit"></i>',
                callback: element => {
                    this.actor.update({"system.Strain.value": 0});
                }
            }]);

            // Skill add/take away rank context menu
            new ContextMenu(html, ".skill-item", this._skillContextMenu);

            // item add/edit menu
            new ContextMenu(html, ".feat-card", this._itemContextMenu)
            new ContextMenu(html, ".item-sheet-card", this._itemContextMenu)
            new ContextMenu(html, ".tenet-focus-card", this._itemContextMenu)

        }
        super.activateListeners(html);

    }

    _onStrainChange(event){
        event.preventDefault();
        let strainCount = this.actor.system.Strain;
        let index = event.currentTarget.dataset.type;
        let newValue = index;

        if(newValue==strainCount.value){
            newValue =0;
        }

        this.actor.update({"system.Strain.value" : newValue});
    }

    _itemRoll(event){
        event.preventDefault();
        const itemID = event.currentTarget.dataset.type;
        const item = (this.actor.items.get(itemID));

        // Depending on the item we want to do something else
        if(item.type == "Skill"){
            Dice.rollSkillFromID(this.actor._id, itemID);
            return;
        }

        item.roll();
    }

    _tenetSwitch(event){
        event.preventDefault();
        const itemID = event.currentTarget.dataset.type;
        const item = (this.actor.items.get(itemID));

        // check if type is a tent else return
        if(item.type !== "Tenet") return;

        item.update({"system.Used" : !item.system.Used});
    }

    _checkSkillRank(skillRank){
        skillRank = Math.floor(skillRank);
        if(skillRank >10) return 10;
        if(skillRank<0) return 0;
        return skillRank;
    }

    _forceRoundDown(event){
        event.preventDefault();
        let element = event.currentTarget;

        element.value = Math.floor(element.value);
    }

    _toggleLastFamily(event){
        event.preventDefault();
        let greatParentNode = event.currentTarget.parentNode.parentNode;
        let toggleHideNode = greatParentNode.getElementsByClassName("hide-on-click");

        if(toggleHideNode.length === 1){
            let toggleNode = toggleHideNode[0];
            $(toggleNode).toggle("hidden");
        }
    }

    _rollSave(event){
        event.preventDefault();
        const saveType = event.currentTarget.dataset.type;

        let saveTypes = this.getData().config.saveTypes;

        if(!saveType.toLowerCase() in saveTypes
        && !saveType in this.actor.system.attributes)
        {
            console.error("'${saveType}' is not a valid attribute for a save");
            return;
        }
        let linkedAttribute = this.actor.system.attributes[saveType];

        Dice.makeSaveRoll({
            linkedAttribute : linkedAttribute,
            skillName: saveTypes[saveType.toLowerCase()]
        });
    }

    _updateSkill(event){
        event.preventDefault();
        let element = event.currentTarget;
        let itemID = element.parentElement.dataset.type;
        let item = this.actor.items.get(itemID);
        let field = element.dataset.field;
        let newValue = element.value;

        if(newValue<0)
            newValue=0;

        // if a weapon check value
        if(item.type == "Weapon" && newValue > item.system.magazine.max){
            newValue = item.system.magazine.max;
        }

        item.update({[field]: Math.floor(newValue)});
    }

}