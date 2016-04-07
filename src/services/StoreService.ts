import {Injectable, provide} from "angular2/core";
import {BusinessAction} from "../business/BusinessAction";
import {ResellerAction} from "../reseller/ResellerAction";
import {AppdbAction} from "../appdb/AppdbAction";
import {AppStore} from "angular2-redux-util/dist/index";
import {StationsAction} from "../stations/StationsAction";
import {List, Map} from 'immutable';
const _ = require('underscore');

@Injectable()
export class StoreService {
    constructor(private appStore:AppStore,
                private businessActions:BusinessAction,
                private resellerAction:ResellerAction,
                private stationsAction:StationsAction,
                private appDbActions:AppdbAction) {
    }

    private singleton:boolean = false; // prevent multiple calls to this service
    private skipServers:Array<string> = ['mars.signage.me', 'mercury.signage.me'];
    // private skipServers:Array<string> = [];

    public loadServices() {
        if (this.singleton)
            return;
        this.singleton = true;
        this.listenServices();
        this.appStore.dispatch(this.businessActions.fetchBusinesses());
        this.appStore.dispatch(this.appDbActions.serverStatus());
        this.appStore.dispatch(this.resellerAction.getResellerInfo());
        this.timedServices();
    }

    private timedServices() {
        // todo: enable in production and set poll value in settings
        // setInterval(()=> {
        //     this.fetchStations()
        // }, 3000);
    }

    private listenServices() {
        this.appStore.sub(() => {
            this.fetchStations();
        }, 'business.businessStats');
    }

    public fetchStations() {
        var sources:Map<string,any> = this.appStore.getState().business.getIn(['businessSources']).getData();
        var config = {}
        sources.forEach((i_businesses:List<string>, source)=> {
            let businesses = i_businesses.toArray();
            if (this.skipServers.indexOf(source) > -1)
                return;
            config[source] = businesses;
        });
        this.appStore.dispatch(this.stationsAction.getStationsInfo(config));
    }
}


// private stationPending:number = 0;

// this.appStore.sub(() => {
//     this.stationPending--;
//     if (this.stationPending == 0) console.log('received all station stats from all servers, even failed ones');
// }, 'stations');

// this.stationPending++;
// this.appStore.dispatch(this.stationsAction.getStationsInfo(source, businesses));

// prevent side effects
// if (this.stationPending != 0)
//     return;