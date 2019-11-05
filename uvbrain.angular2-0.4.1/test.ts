// 1. Component
// 2. FullComponent with all parameters
// 3. Service
// 4. Pipe
// 5. Directive
// 6. Service with Http
// 7. Component, Model, Service
// 8. EventEmitter
// 9. Component with CORE_DIRECTIVES, FORM_DIRECTIVES etc
// 10. Componet with all lifecycle events
	
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
/**
* Add the template content to the DOM unless the condition is true.
*
* If the expression assigned to `myUnless` evaluates to a truthy value
* then the templated elements are removed removed from the DOM,
* the templated elements are (re)inserted into the DOM.
*
* <div *ngUnless=
 class=
>
*   Congrats! Everything is great!
* </div>
*
* ### Syntax
* *
* - `<div *myUnless=
>...</div>`
* - `<div template=
>...</div>`
* - `<template [myUnless]=
><div>...</div></template>`
*
*/
@Directive({ selector: '[test]'})
export class testDirective {
    private hasView = false;
    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef) { }

    @Input() set myUnless(condition: boolean) {
        if (!condition && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (condition && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }
}