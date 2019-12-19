import React, { FunctionComponent, useCallback } from "react";
import { useField } from "react-final-form";

import { ValidationMessage } from "coral-framework/lib/form";
import { graphql, withFragmentContainer } from "coral-framework/lib/relay";
import { validateEventSelection } from "coral-framework/lib/validation";
import { Typography } from "coral-ui/components";
import {
  Button,
  CheckBox,
  Flex,
  FormField,
  HelperText,
  Label,
  ListGroup,
  ListGroupRow,
} from "coral-ui/components/v2";

import {
  EventsSelectField_settings,
  WEBHOOK_EVENT_NAME,
} from "coral-admin/__generated__/EventsSelectField_settings.graphql";

import styles from "./EventsSelectField.css";

interface Props {
  settings: EventsSelectField_settings;
}

const EventsSelectField: FunctionComponent<Props> = ({ settings }) => {
  const { input: all } = useField<boolean>("all");
  const { input: events, meta } = useField<WEBHOOK_EVENT_NAME[]>("events", {
    validate: validateEventSelection,
  });

  const onClear = useCallback(() => {
    if (all.value) {
      all.onChange(false);
    } else {
      events.onChange([]);
    }
  }, [all, events]);

  const onCheckChange = useCallback(
    (event: WEBHOOK_EVENT_NAME, selectedIndex: number) => () => {
      const changed = [...events.value];
      if (selectedIndex >= 0) {
        changed.splice(selectedIndex, 1);
      } else {
        changed.push(event);
      }

      events.onChange(changed);
    },
    [events]
  );

  const onRecieveAll = useCallback(() => {
    all.onChange(true);
  }, [all]);

  return (
    <FormField>
      <Flex justifyContent="space-between">
        <Label>Events to send</Label>
        {(all.value || events.value.length > 0) && (
          <Button variant="text" onClick={onClear}>
            Clear
          </Button>
        )}
      </Flex>

      <ListGroup className={styles.list}>
        {settings.webhookEvents.map(event => {
          const selectedIndex = events.value.indexOf(event);
          return (
            <ListGroupRow key={event}>
              <CheckBox
                disabled={all.value}
                checked={all.value || selectedIndex >= 0}
                onChange={onCheckChange(event, selectedIndex)}
              >
                <Typography className={styles.event}>{event}</Typography>
              </CheckBox>
            </ListGroupRow>
          );
        })}
      </ListGroup>
      {all.value ? (
        <HelperText>
          You will receive all events, including any added in the future.
        </HelperText>
      ) : events.value.length > 0 ? (
        <HelperText>You have selected {events.value.length} events.</HelperText>
      ) : (
        <HelperText>
          Select events above or{" "}
          <Button variant="text" onClick={onRecieveAll}>
            receive all events
          </Button>
          .
        </HelperText>
      )}
      <ValidationMessage meta={meta} fullWidth />
    </FormField>
  );
};

const enhanced = withFragmentContainer<Props>({
  settings: graphql`
    fragment EventsSelectField_settings on Settings {
      webhookEvents
    }
  `,
})(EventsSelectField);

export default enhanced;