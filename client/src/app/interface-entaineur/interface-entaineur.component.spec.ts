import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterfaceEntaineurComponent } from './interface-entaineur.component';

describe('InterfaceEntaineurComponent', () => {
  let component: InterfaceEntaineurComponent;
  let fixture: ComponentFixture<InterfaceEntaineurComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InterfaceEntaineurComponent]
    });
    fixture = TestBed.createComponent(InterfaceEntaineurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
