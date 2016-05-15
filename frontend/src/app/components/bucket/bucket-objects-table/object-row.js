import { formatSize } from 'utils';
import ko from 'knockout';
import { dblEncode } from 'utils';

const statusIconMapping = Object.freeze({
    AVALIABLE: {
        toolTip: 'Avaliable',
        icon: '/fe/assets/icons.svg#object-healthy',
    },
    IN_PROCESS: {
        toolTip: 'In Process',
        icon: '/fe/assets/icons.svg#object-in-porcess'
    },
    UNAVALIABLE: {
        toolTip: 'Unavaliable',
        icon: '/fe/assets/icons.svg#object-problem'
    }
});

export default class ObjectRowViewModel {
    constructor(obj) {
        this.isVisible = ko.pureComputed(
            () => !!obj()
        );

        this.name = ko.pureComputed(
            () => obj() && obj().key
        );

        let stateMap = ko.pureComputed(
            () => obj() && statusIconMapping[obj().info.state || 'AVALIABLE']
        );

        this.stateToolTip = ko.pureComputed(
            () => stateMap() && stateMap().toolTip
        );

        this.stateIcon = ko.pureComputed(
            () => stateMap() && stateMap().icon
        );

        this.href = ko.pureComputed(
            () => `/fe/systems/:system/buckets/:bucket/objects/${
                dblEncode(this.name())
            }`
        );

        this.size = ko.pureComputed(
            () => obj() && formatSize(obj().info.size)
        );
    }
}
