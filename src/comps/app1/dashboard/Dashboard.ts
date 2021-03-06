import {Component, ViewChild, ChangeDetectorRef} from 'angular2/core'
import {Infobox} from "../../infobox/Infobox";
import {List, Map} from 'immutable';
import {AppStore} from "angular2-redux-util/dist/index";
import {BusinessAction} from "../../../business/BusinessAction";
import {ServerStats} from "./ServerStats";
import {ServerAvg} from "./ServerAvg";
import {AppdbAction} from "../../../appdb/AppdbAction";
import {StationsMap} from "./StationsMap";
import {CanActivate, OnActivate, ComponentInstruction, Router} from "angular2/router";
import {appInjService} from "../../../services/AppInjService";
import {AuthService} from "../../../services/AuthService";
import {StationModel} from "../../../stations/StationModel";
import {Loading} from "../../loading/Loading";
import {SortBy} from "../../../pipes/SortBy";
import {StationsGrid} from "./StationsGrid";
import {CommBroker, IMessage} from "../../../services/CommBroker";
import {Consts} from "../../../Conts";
import {FORM_DIRECTIVES, Control} from "angular2/common";
import {ModalComponent} from "../../ng2-bs3-modal/components/modal";
import {MODAL_DIRECTIVES} from "../../ng2-bs3-modal/ng2-bs3-modal";
import {StationDetails} from "./StationDetails";
import * as _ from 'lodash'

type stationComponentMode = "map" | "grid";

@Component({
    directives: [FORM_DIRECTIVES, MODAL_DIRECTIVES, Infobox, ServerStats,
        ServerAvg, StationsMap, StationsGrid, Loading, StationDetails],
    selector: 'Dashboard',
    pipes: [SortBy],
    styles: [`      
      * {
             border-radius: 0 !important;
        }
        input {
             border-radius: 0 !important;
        }
    `],
    providers: [BusinessAction],
    templateUrl: '/src/comps/app1/dashboard/Dashboard.html'
})

@CanActivate((to:ComponentInstruction, from:ComponentInstruction) => {
    let authService:AuthService = appInjService().get(AuthService);
    return authService.checkAccess(to, from);
})
export class Dashboard implements OnActivate {

    constructor(private appStore:AppStore, private appDbActions:AppdbAction, private cd:ChangeDetectorRef, private commBroker:CommBroker) {
        // constructor(private appStore:AppStore, private appDbActions:AppdbAction, private commBroker:CommBroker) {
        this.serverStats = [];
        this.serverStatsCategories = [];
        this.serverAvgResponse = 0;
        // this.appStore.dispatch(this.appDbActions.serverStatus());
        this.listenBusinessNameFilter();
        this.listenStore()
        this.listenStationsErrors()
    }

    @ViewChild('modalStationDetails')
    modalStationDetails:ModalComponent;


    private selectedStation:StationModel;
    private screensOnline:string = 'screens online: 0';
    private screensOffline:string = 'screens offline: 0';
    private stationComponentMode:stationComponentMode = 'grid';
    private totalFilteredPlayers:number = 0;
    private businessNameControl:Control = new Control();
    private stations:Map<string, List<StationModel>>;
    private unsubs:Array<()=>void> = [];
    private businessStats = {};
    private serverStats;
    private errorLoadingStations:boolean = false;
    private serverAvgResponse;
    private serverStatsCategories;
    private stationsFiltered:List<StationModel>;
    private stationsFilteredBy = {
        connection: 'all',
        name: 'all',
        os: 'all',
        airVersion: 'all',
        appVersion: 'all'
    }
    private stationsFilter = {
        os: [],
        airVersion: [],
        appVersion: []
    };

    routerOnActivate(to:ComponentInstruction, from:ComponentInstruction) {
    }

    private listenStationsErrors() {
        this.commBroker.onEvent(Consts.Events().STATIONS_NETWORK_ERROR).subscribe((e:IMessage)=> {
            this.errorLoadingStations = true;
        });
    }

    private onModalClose(event) {

    }

    private listenStore() {
        var unsub;

        /** stations stats **/
        this.stations = this.appStore.getState().stations;
        this.initStationsFilter();
        this.onStationsFilterSelected('connection', 'all', 1000);
        unsub = this.appStore.sub((stations:Map<string, List<StationModel>>) => {
            this.stations = stations;
            this.initStationsFilter();
            //this.onStationsFilterSelected('connection', 'all', 1000);
            this.setStationsFiltered();
        }, 'stations');
        this.unsubs.push(unsub);

        /** business stats **/
        this.businessStats = this.appStore.getState().business.getIn(['businessStats']) || {};
        unsub = this.appStore.sub((i_businesses:Map<string,any>) => {
            this.businessStats = i_businesses;
        }, 'business.businessStats');
        this.unsubs.push(unsub);

        /** servers response stats **/
        var serversStatus = this.appStore.getState().appdb.getIn(['serversStatus']);
        this.loadServerStats(serversStatus);
        unsub = this.appStore.sub((serversStatus:Map<string,any>) => {
            this.loadServerStats(serversStatus);
        }, 'appdb.serversStatus', false);
        this.unsubs.push(unsub);
    }

    private loadServerStats(serversStatus:Map<string,any>) {
        if (!serversStatus)
            return;
        var self = this;
        let c = 0;
        let t = 0;
        this.serverStats = [];
        this.serverStatsCategories = [];
        var servers = ['galaxy'];
        this.appStore.getState().stations.forEach((v, server)=> {
            servers.push(server.split('.')[0]);
        });
        serversStatus.forEach((value, key)=> {
            // only show servers that user has stations on
            if (servers.indexOf(key) > -1) {
                self.serverStatsCategories.push(key);
                c++;
                t = t + Number(value);
                self.serverStats.push(Number(value));
            }
        })
        this.serverAvgResponse = t / c;
    }

    private onStationComponentSelect(stationComponentMode:stationComponentMode) {
        this.stationComponentMode = stationComponentMode;
        switch (stationComponentMode) {
            case 'map':
            {
                break;
            }
            case 'grid':
            {
                break;
            }
        }
    }

    private initStationsFilter() {
        this.stations.forEach((stationList:List<StationModel>, source)=> {
            stationList.forEach((i_station:StationModel)=> {
                this.stationsFilter['os'].push(i_station.getKey('os'));
                this.stationsFilter['appVersion'].push(i_station.getKey('appVersion'));
                this.stationsFilter['airVersion'].push(i_station.getKey('airVersion'));
            })
        });
        this.stationsFilter['os'] = _.uniq(this.stationsFilter['os']).filter(function (n) {
            return n != ''
        });
        this.stationsFilter['appVersion'] = _.uniq(this.stationsFilter['appVersion']).filter(function (n) {
            return n != ''
        });
        this.stationsFilter['airVersion'] = _.uniq(this.stationsFilter['airVersion']).filter(function (n) {
            return n != ''
        });
    }

    private setStationsFiltered() {

        setTimeout(()=> {
            var stationsFiltered = List<StationModel>();
            var screensOnline = 0;
            var screensOffline = 0;
            var score;
            var STATION_SCORE = 5;

            this.stations.forEach((stationList:List<StationModel>, source)=> {
                stationList.forEach((i_station:StationModel)=> {
                    score = 0;
                    var os = i_station.getKey('os');
                    var appVersion = i_station.getKey('appVersion');
                    var airVersion = i_station.getKey('airVersion');
                    var connection = i_station.getKey('connection');
                    var name = i_station.getKey('name');

                    connection == 0 ? screensOffline++ : screensOnline++;

                    if ((this.stationsFilteredBy['os'] == 'all' || this.stationsFilteredBy['os'] == os))
                        score++;
                    if (this.stationsFilteredBy['name'] == 'all' || name.toLowerCase().match(this.stationsFilteredBy['name'] .toLowerCase()))
                        score++;
                    if (this.stationsFilteredBy['appVersion'] == 'all' || this.stationsFilteredBy['appVersion'] == appVersion)
                        score++;
                    if (this.stationsFilteredBy['airVersion'] == 'all' || this.stationsFilteredBy['airVersion'] == airVersion)
                        score++;
                    if (this.stationsFilteredBy['connection'] == 'all' || this.stationsFilteredBy['connection'] == connection || (this.stationsFilteredBy['connection'] == '1' && connection > 0))
                        score++;
                    if (score == STATION_SCORE)
                        stationsFiltered = stationsFiltered.push(i_station)
                })
            });
            this.screensOffline = 'screens offline ' + screensOffline;
            this.screensOnline = 'screens online ' + screensOnline;
            this.stationsFiltered = stationsFiltered;
            this.totalFilteredPlayers = this.stationsFiltered.size;
            this.cd.markForCheck();
        }, 1000)
    }

    private onStationsFilterSelected(filterType, filterValue, delay:number) {
        if (filterType == 'connection') {
            if (filterValue == 'connected') {
                filterValue = '1'
            } else if (filterValue == 'disconnected') {
                filterValue = '0';
            }
        }
        if (filterType == 'name') {
            if (filterValue == '')
                filterValue = 'all'
        }
        this.stationsFilteredBy[filterType] = filterValue.match('all') ? 'all' : filterValue;
        this.setStationsFiltered();
    }

    private onStationModalOpen(stationId) {
        this.stationsFiltered.forEach((stationModel:StationModel)=> {
            if (stationModel.getStationId() == stationId){
                this.selectedStation = stationModel;
                this.modalStationDetails.open('lg');
            }
        });
    }

    private listenBusinessNameFilter() {
        return this.businessNameControl.valueChanges
            .debounceTime(250)
            .distinctUntilChanged()
            .subscribe(value=> {
                this.onStationsFilterSelected('name', value, 100);
            });
    }

    private ngOnDestroy() {
        this.unsubs.forEach((unsub:()=>void)=> {
            unsub();
        })
    }
}


// import {createSelector} from 'reselect';
// const stationSelector = createSelector(function (state) {
//     return state
// }, function (stations:Map<any,List<any>>) {
//     var stationsFilter = {
//         os: [],
//         airVersion: [],
//         appVersion: []
//     };
//     stations.forEach((stationList:List<StationModel>, source)=> {
//         stationList.forEach((i_station:StationModel)=> {
//             stationsFilter['os'].push(i_station.getKey('os'));
//             stationsFilter['appVersion'].push(i_station.getKey('appVersion'));
//             stationsFilter['airVersion'].push(i_station.getKey('airVersion'));
//         })
//     });
//     return stations;
// })
