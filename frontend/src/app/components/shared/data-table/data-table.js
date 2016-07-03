import template from './data-table.html';
import ColumnViewModel from './column';
import * as defaultColumnTemplates from './column-templates';
import ko from 'knockout';

class DataTableViewModel {
    constructor({ columns = [], rows = [], sorting }, customTemplates) {
        this.columnTemplates = Object.assign(
            {},
            defaultColumnTemplates,
            customTemplates
        );

        this.columns = ko.pureComputed(
            () => ko.unwrap(columns).map(
                value => new ColumnViewModel(value, sorting)
            )
        );

        this.rows = rows;
        this.sorting = sorting;
    }

    getSortCss(columnName, sortable) {
        if (!this.sorting || !sortable) {
            return '';
        }

        let { sortBy, order } = ko.unwrap(this.sorting) || {};
        return `sortable ${
            sortBy === columnName ? (order === 1 ? 'des' : 'asc') : ''
        }`;
    }

    getCellTemplate(row, { name, template }) {
        let cell = row[name];
        return {
            if: cell,
            html: this.columnTemplates[template],
            data: () => cell
        };
    }

    sortBy(newColumn) {
        let { sortBy, order } = this.sorting();
        this.sorting({
            sortBy: newColumn,
            order: sortBy === newColumn ? 0 - order : 1
        });
    }
}

function viewModelFactory(params, info) {
    let columnTemplates = info.templateNodes
        .filter(
            ({ nodeType }) => nodeType === 1
        )
        .reduce(
            (templates, template) => {
                let name = template.getAttribute('name');
                let html = template.innerHTML;
                templates[name] = html;
                return templates;
            },
            {}
        );

    return new DataTableViewModel(params, columnTemplates);
}

export default {
    viewModel: { createViewModel: viewModelFactory },
    template: template
};
