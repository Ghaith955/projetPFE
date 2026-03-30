import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterfaceNageurComponent } from './interface-nageur.component';

describe('InterfaceNageurComponent', () => {
  let component: InterfaceNageurComponent;
  let fixture: ComponentFixture<InterfaceNageurComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InterfaceNageurComponent]
    });
    fixture = TestBed.createComponent(InterfaceNageurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
